import express from 'express';
import helmet from 'helmet';
import { apiRouter } from './routes/index.js';
import { publicRouter } from './routes/public/public.js';
import { authRouter } from './routes/auth/auth.js';
import { corsMiddleware } from './middleware/cors.js';
import { errorHandler } from './middleware/error-handler.js';

export function createApp() {
  const app = express();

  // ALB terminates TLS, so the client IP the rate limiter keys on comes from
  // X-Forwarded-For. One proxy hop only — do not widen this to `true`.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  // JSON API: helmet's defaults (nosniff, no framing, HSTS) cost nothing here.
  app.use(helmet());
  app.use(corsMiddleware());
  app.use(express.json({ limit: '100kb' }));

  // Unauthenticated: the ALB health check hits this directly.
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  // Order matters. The public transparency dashboard is mounted first so it
  // never passes through requireAuth. /api/auth follows: login, reset and the
  // MFA challenge run without a session, and its authenticated routes guard
  // themselves. Everything under /api after this point requires a session.
  app.use('/api/public', publicRouter);
  app.use('/api/auth', authRouter);
  app.use('/api', apiRouter);

  app.use(errorHandler);

  return app;
}
