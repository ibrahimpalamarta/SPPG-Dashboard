import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../../config/env.js';
import { ERRORS } from '../../constants/errors.js';
import { prisma } from '../../db.js';
import { requireAuth } from '../../auth/guard.js';
import { validate } from '../../middleware/validate.js';
import { wrap } from '../../lib/wrap.js';
import { idParam } from '../../schemas/common.js';
import {
  changePasswordBody,
  loginBody,
  mfaDisableBody,
  mfaEnableBody,
  mfaVerifyBody,
  resetPasswordBody,
} from '../../schemas/auth.js';
import {
  changePassword,
  login,
  logout,
  mfaDisable,
  mfaEnable,
  mfaSetup,
  mySessions,
  resetPassword,
  revokeMySession,
  verifyMfa,
} from '../../controllers/auth/auth.js';

/** Credential-guessing surface: much tighter than the general API limiter. */
const credentialLimiter = rateLimit({
  windowMs: env.AUTH_ENDPOINT_RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_ENDPOINT_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: ERRORS.TOO_MANY_REQUESTS.body,
});

/**
 * Mounted before the authenticated API in app.ts. The first three routes are
 * the ones that run without a session; everything after `requireAuth` needs
 * one, and the MFA/logout routes accept a not-yet-enrolled session so a role
 * that must use MFA can enrol.
 */
export const authRouter = Router();

authRouter.post('/login', credentialLimiter, validate({ body: loginBody }), wrap(login()));
authRouter.post('/mfa/verify', credentialLimiter, validate({ body: mfaVerifyBody }), wrap(verifyMfa()));
authRouter.post('/reset-password', credentialLimiter, validate({ body: resetPasswordBody }), wrap(resetPassword()));

authRouter.use(requireAuth(prisma, { allowUnenrolled: true }));

authRouter.post('/logout', wrap(logout()));
authRouter.post('/mfa/setup', wrap(mfaSetup()));
authRouter.post('/mfa/enable', validate({ body: mfaEnableBody }), wrap(mfaEnable()));
authRouter.post('/mfa/disable', credentialLimiter, validate({ body: mfaDisableBody }), wrap(mfaDisable()));
authRouter.post('/password', credentialLimiter, validate({ body: changePasswordBody }), wrap(changePassword()));
authRouter.get('/sessions', wrap(mySessions()));
authRouter.delete('/sessions/:id', validate({ params: idParam }), wrap(revokeMySession()));
