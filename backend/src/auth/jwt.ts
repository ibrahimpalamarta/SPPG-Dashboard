import { createRemoteJWKSet, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from 'jose';
import type { RequestHandler } from 'express';
import { env, AUTH0_ISSUER } from '../config/env.js';

/** What the token asserts. Display-only until reconciled against Postgres. */
export interface AuthContext {
  sub: string;
  email?: string;
  name?: string;
  roleClaims: unknown;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

/**
 * createRemoteJWKSet keeps the key set in memory and only refetches when a
 * token arrives with an unseen `kid` — and even then no more than once per
 * cooldown. So: no JWKS request on the hot path, and no unbounded refetch loop
 * if someone sprays tokens with random kids.
 */
const remoteJwks: JWTVerifyGetKey = createRemoteJWKSet(
  new URL(`${AUTH0_ISSUER}.well-known/jwks.json`),
  { cacheMaxAge: 10 * 60_000, cooldownDuration: 30_000 },
);

function toAuthContext(payload: JWTPayload): AuthContext {
  if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
    throw new Error('missing sub');
  }
  return {
    sub: payload.sub,
    email: typeof payload.email === 'string' ? payload.email : undefined,
    name: typeof payload.name === 'string' ? payload.name : undefined,
    roleClaims: payload[env.AUTH0_ROLES_CLAIM],
  };
}

const unauthorized = { error: 'unauthorized', message: 'Invalid or expired token' } as const;

/**
 * Authentication only: proves the caller holds a live Auth0 access token for
 * this API. Says nothing about what they may do — that is guard.ts.
 *
 * Verifies signature *and* issuer *and* audience; a token minted for another
 * API in the same tenant is rejected here.
 *
 * @param jwks override the key resolver (tests inject a local public key).
 */
export function requireAuth(jwks: JWTVerifyGetKey = remoteJwks): RequestHandler {
  return async (req, res, next) => {
    const header = req.headers.authorization;
    if (typeof header !== 'string' || !header.startsWith('Bearer ')) {
      res.status(401).json({ error: 'unauthorized', message: 'Missing bearer token' });
      return;
    }

    try {
      const { payload } = await jwtVerify(header.slice(7).trim(), jwks, {
        issuer: AUTH0_ISSUER,
        audience: env.AUTH0_AUDIENCE,
      });
      req.auth = toAuthContext(payload);
      next();
    } catch {
      // Deliberately opaque: expired vs bad-signature vs wrong-audience all
      // look the same to the client. The reason stays server-side.
      res.status(401).json(unauthorized);
    }
  };
}
