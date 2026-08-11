import express from 'express';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { requireAuth } from './auth/jwt.js';
import { attachUser, requireRole } from './auth/guard.js';

export function createApp() {
  const app = express();

  // ALB terminates TLS, so the client IP the rate limiter keys on comes from
  // X-Forwarded-For. One proxy hop only — do not widen this to `true`.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  // Unauthenticated: the ALB health check hits this directly.
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  // Every authenticated route is rate limited: token verification is cheap but
  // the find-or-create behind it is a DB write on first sight.
  const authLimiter = rateLimit({
    windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
    max: env.AUTH_RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'too_many_requests', message: 'Rate limit exceeded' },
  });

  const api = express.Router();
  api.use(authLimiter, requireAuth(), attachUser());

  api.get('/me', (req, res) => {
    const u = req.user!;
    res.json({ id: u.id, email: u.email, name: u.name, role: u.role, scopeId: u.scopeId });
  });

  // Example of the guard in place; feature routes land here next phase.
  api.get('/admin/ping', requireRole('SUPER_ADMIN'), (_req, res) => res.json({ ok: true }));

  app.use('/api', api);

  app.use((_req, res) => res.status(404).json({ error: 'not_found' }));

  // Last resort: log server-side, return nothing useful to the caller.
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('unhandled error', { error: String(err) });
    res.status(500).json({ error: 'internal_error' });
  });

  return app;
}
