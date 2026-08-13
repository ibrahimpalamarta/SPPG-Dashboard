import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { requireAuth } from '../auth/jwt.js';
import { attachUser } from '../auth/guard.js';
import { ERRORS } from '../constants/errors.js';
import { meRouter } from './auth/me.js';
import { adminRouter } from './admin/admin.js';

// Every authenticated route is rate limited: token verification is cheap but
// the find-or-create behind it is a DB write on first sight.
const authLimiter = rateLimit({
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: ERRORS.TOO_MANY_REQUESTS.body,
});

export const apiRouter = Router();

apiRouter.use(authLimiter, requireAuth(), attachUser());
apiRouter.use('/me', meRouter);
apiRouter.use('/admin', adminRouter);
