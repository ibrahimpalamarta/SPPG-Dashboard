import express from 'express';
import { apiRouter } from './routes/index.js';
import { errorHandler } from './middleware/error-handler.js';

export function createApp() {
  const app = express();

  // ALB terminates TLS, so the client IP the rate limiter keys on comes from
  // X-Forwarded-For. One proxy hop only — do not widen this to `true`.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  // Unauthenticated: the ALB health check hits this directly.
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  app.use('/api', apiRouter);

  app.use(errorHandler);

  return app;
}
