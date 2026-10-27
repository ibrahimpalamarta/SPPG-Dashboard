import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../../config/env.js';
import { ERRORS } from '../../constants/errors.js';
import { sendError } from '../../middleware/error-handler.js';
import { validate } from '../../middleware/validate.js';
import { wrap } from '../../lib/wrap.js';
import { publicIdParam } from '../../schemas/common.js';
import { publicContentQuery, publicNutritionQuery } from '../../schemas/public.js';
import {
  getPublicAnnouncement,
  getPublicSummary,
  listPublicAnnouncements,
  listPublicDocuments,
  listPublicGallery,
  listPublicKitchens,
  listPublicNutrition,
} from '../../controllers/public/public.js';

/**
 * The transparency dashboard (SCRUM-10/13). Mounted ahead of the authenticated
 * tree in app.ts, so nothing here sees requireAuth.
 *
 * Its own limiter: these requests carry no token to verify and no find-or-
 * create write behind them, so they are cheaper — but they also have no caller
 * identity, which is why the window is short rather than generous.
 */
const publicLimiter = rateLimit({
  windowMs: env.PUBLIC_RATE_LIMIT_WINDOW_MS,
  max: env.PUBLIC_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: ERRORS.TOO_MANY_REQUESTS.body,
});

export const publicRouter = Router();

publicRouter.use(publicLimiter);

publicRouter.get('/summary', wrap(getPublicSummary()));
publicRouter.get('/kitchens', wrap(listPublicKitchens()));
publicRouter.get('/nutrition', validate({ query: publicNutritionQuery }), wrap(listPublicNutrition()));

publicRouter.get(
  '/announcements',
  validate({ query: publicContentQuery }),
  wrap(listPublicAnnouncements()),
);
publicRouter.get(
  '/announcements/:publicId',
  validate({ params: publicIdParam }),
  wrap(getPublicAnnouncement()),
);

publicRouter.get('/documents', validate({ query: publicContentQuery }), wrap(listPublicDocuments()));
publicRouter.get('/gallery', validate({ query: publicContentQuery }), wrap(listPublicGallery()));

// Terminate the branch. Without this, an unknown /api/public/* path falls
// through to the authenticated router mounted after it and answers 401 —
// telling an anonymous caller that some token would have made a nonexistent
// endpoint work.
publicRouter.use((_req, res) => sendError(res, 'NOT_FOUND'));
