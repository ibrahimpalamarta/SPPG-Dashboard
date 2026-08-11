import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { SignJWT, generateKeyPair, type JWTVerifyGetKey } from 'jose';
import type { Request, Response } from 'express';
import { requireAuth } from './jwt.js';
import { AUTH0_ISSUER, env } from '../config/env.js';

const { publicKey, privateKey } = await generateKeyPair('RS256');
const jwks: JWTVerifyGetKey = async () => publicKey;
const otherKeys = await generateKeyPair('RS256');

interface Signed {
  issuer?: string;
  audience?: string;
  expiresIn?: string;
  key?: CryptoKey;
  claims?: Record<string, unknown>;
  sub?: string | null;
}

async function sign(o: Signed = {}) {
  let jwt = new SignJWT({ ...o.claims })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt()
    .setIssuer(o.issuer ?? AUTH0_ISSUER)
    .setAudience(o.audience ?? env.AUTH0_AUDIENCE)
    .setExpirationTime(o.expiresIn ?? '5m');
  if (o.sub !== null) jwt = jwt.setSubject(o.sub ?? 'auth0|abc123');
  return jwt.sign(o.key ?? privateKey);
}

/** Runs the middleware and reports what it did. */
async function run(authorization?: string) {
  const req = { headers: authorization ? { authorization } : {} } as unknown as Request;
  let status: number | undefined;
  let body: unknown;
  const res = {
    status(code: number) {
      status = code;
      return this;
    },
    json(payload: unknown) {
      body = payload;
      return this;
    },
  } as unknown as Response;
  let nexted = false;

  await requireAuth(jwks)(req, res, () => {
    nexted = true;
  });
  return { req, status, body: body as { error?: string; message?: string } | undefined, nexted };
}

describe('requireAuth', () => {
  test('accepts a valid token and exposes the claims', async () => {
    const token = await sign({
      claims: { email: 'a@example.com', name: 'A', [env.AUTH0_ROLES_CLAIM]: ['super_admin'] },
    });
    const { req, nexted, status } = await run(`Bearer ${token}`);

    assert.equal(nexted, true);
    assert.equal(status, undefined);
    assert.equal(req.auth?.sub, 'auth0|abc123');
    assert.equal(req.auth?.email, 'a@example.com');
    assert.deepEqual(req.auth?.roleClaims, ['super_admin']);
  });

  test('rejects a missing Authorization header', async () => {
    const { status, nexted, body } = await run();
    assert.equal(status, 401);
    assert.equal(nexted, false);
    assert.equal(body?.error, 'unauthorized');
  });

  test('rejects a non-Bearer scheme', async () => {
    const { status, nexted } = await run('Basic dXNlcjpwYXNz');
    assert.equal(status, 401);
    assert.equal(nexted, false);
  });

  test('rejects an expired token', async () => {
    const token = await sign({ expiresIn: '-1s' });
    const { status, nexted } = await run(`Bearer ${token}`);
    assert.equal(status, 401);
    assert.equal(nexted, false);
  });

  test('rejects a token signed by the wrong key', async () => {
    const token = await sign({ key: otherKeys.privateKey });
    const { status, nexted } = await run(`Bearer ${token}`);
    assert.equal(status, 401);
    assert.equal(nexted, false);
  });

  test('rejects a token from another issuer', async () => {
    const token = await sign({ issuer: 'https://evil.example.com/' });
    const { status, nexted } = await run(`Bearer ${token}`);
    assert.equal(status, 401);
    assert.equal(nexted, false);
  });

  test('rejects a token minted for another audience', async () => {
    const token = await sign({ audience: 'https://some-other-api/' });
    const { status, nexted } = await run(`Bearer ${token}`);
    assert.equal(status, 401);
    assert.equal(nexted, false);
  });

  test('rejects a token with no subject', async () => {
    const token = await sign({ sub: null });
    const { status, nexted } = await run(`Bearer ${token}`);
    assert.equal(status, 401);
    assert.equal(nexted, false);
  });

  test('rejects malformed garbage', async () => {
    const { status, nexted } = await run('Bearer not.a.jwt');
    assert.equal(status, 401);
    assert.equal(nexted, false);
  });

  test('leaks nothing about why verification failed', async () => {
    const expired = await run(`Bearer ${await sign({ expiresIn: '-1s' })}`);
    const wrongKey = await run(`Bearer ${await sign({ key: otherKeys.privateKey })}`);

    assert.deepEqual(expired.body, wrongKey.body);
    assert.equal(expired.body?.message, 'Invalid or expired token');
  });
});
