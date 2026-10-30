import { Router, type Request } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { requireAuth } from '../auth/guard.js';
import { prisma } from '../db.js';
import { ERRORS } from '../constants/errors.js';
import { meRouter } from './auth/me.js';
import { adminRouter } from './admin/admin.js';
import { kitchenRouter } from './master/kitchen.js';
import { ingredientRouter } from './master/ingredient.js';
import { akgTargetRouter } from './master/akg-target.js';
import { referenceEntryRouter } from './master/reference-entry.js';
import { uploadBatchRouter } from './upload/upload-batch.js';
import { validationIssueRouter } from './upload/validation-issue.js';
import { governmentSubmissionRouter } from './upload/government-submission.js';
import { menuPlanRouter } from './menu/menu-plan.js';
import { inboxRouter } from './inbox/inbox.js';
import {
  akgComplianceRouter,
  dailyKitchenRouter,
  dashboardRouter,
  menuCostRouter,
  menuNutritionRouter,
  summaryRouter,
} from './mart/mart.js';
import { announcementRouter, documentRouter, galleryRouter } from './cms/cms.js';

// Every authenticated route is rate limited: each request costs a session
// lookup, and an unauthenticated flood would otherwise reach the database.
// Keyed by the bearer token, not the IP: all of our traffic arrives from the
// frontend server, so an IP key would charge every user behind it against one
// shared budget (seen in practice: normal pagination on one user's session
// 429'd everyone else's /api/me).
const limiterOptions = {
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: ERRORS.TOO_MANY_REQUESTS.body,
  keyGenerator: (req: Request) => req.headers.authorization ?? req.ip ?? '',
};
const authLimiter = rateLimit(limiterOptions);
// Separate instance/budget: the shell calls /me on every navigation, so a
// data-heavy page's burst of other requests must not be able to exhaust it
// and 429 the one call the layout needs to render at all.
const meLimiter = rateLimit(limiterOptions);

export const apiRouter = Router();

// /me is how the shell learns it must send the user to MFA enrolment, so it is
// the one route open to a session that has not enrolled yet.
apiRouter.use('/me', meLimiter, requireAuth(prisma, { allowUnenrolled: true }), meRouter);

apiRouter.use(authLimiter);

apiRouter.use(requireAuth());
apiRouter.use('/admin', adminRouter);

// Master data
apiRouter.use('/kitchens', kitchenRouter);
apiRouter.use('/ingredients', ingredientRouter);
apiRouter.use('/akg-targets', akgTargetRouter);
apiRouter.use('/reference-entries', referenceEntryRouter);

// Upload & operational
apiRouter.use('/upload-batches', uploadBatchRouter);
apiRouter.use('/validation-issues', validationIssueRouter);
apiRouter.use('/government-submissions', governmentSubmissionRouter);
apiRouter.use('/menu-plans', menuPlanRouter);
apiRouter.use('/inbox', inboxRouter);

// Pre-computed marts (read-only)
apiRouter.use('/menu-nutritions', menuNutritionRouter);
apiRouter.use('/daily-kitchens', dailyKitchenRouter);
apiRouter.use('/akg-compliances', akgComplianceRouter);
apiRouter.use('/menu-costs', menuCostRouter);
apiRouter.use('/summaries', summaryRouter);
apiRouter.use('/dashboard', dashboardRouter);

// CMS
apiRouter.use('/cms/announcements', announcementRouter);
apiRouter.use('/cms/documents', documentRouter);
apiRouter.use('/cms/gallery', galleryRouter);
