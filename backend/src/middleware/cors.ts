import cors from 'cors';
import type { RequestHandler } from 'express';
import { env } from '../config/env.js';

/**
 * In staging and production this is a no-op: frontend-admin calls this API
 * from its server (API_BASE_URL), never from the browser, so no browser call
 * is cross-origin.
 *
 * It exists for local development — Next.js on :3000 talking to this API on
 * :8080 is cross-origin and would otherwise fail preflight.
 *
 * Unset CORS_ORIGINS means no CORS headers at all, which is the safe default:
 * an allow-list is opt-in, never inferred.
 */
export function corsMiddleware(): RequestHandler {
  const origins = env.CORS_ORIGINS;
  if (origins.length === 0) return (_req, _res, next) => next();

  return cors({
    origin: origins,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    maxAge: 86_400,
  });
}
