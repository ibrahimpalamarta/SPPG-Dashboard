import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { requireAuth } from '../auth/jwt.js';
import { attachUser } from '../auth/guard.js';
import { ERRORS } from '../constants/errors.js';
import { meRouter } from './auth/me.js';
import { adminRouter } from './admin/admin.js';
import { kitchenRouter } from './master/kitchen.js';
import { ingredientRouter } from './master/ingredient.js';
import { akgTargetRouter } from './master/akg-target.js';
import { uploadBatchRouter } from './upload/upload-batch.js';
import { menuPlanRouter } from './menu/menu-plan.js';
import {
  akgComplianceRouter,
  dailyKitchenRouter,
  dashboardRouter,
  menuCostRouter,
  menuNutritionRouter,
  summaryRouter,
} from './mart/mart.js';
import { announcementRouter, documentRouter, galleryRouter } from './cms/cms.js';

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

// Master data
apiRouter.use('/kitchens', kitchenRouter);
apiRouter.use('/ingredients', ingredientRouter);
apiRouter.use('/akg-targets', akgTargetRouter);

// Upload & operational
apiRouter.use('/upload-batches', uploadBatchRouter);
apiRouter.use('/menu-plans', menuPlanRouter);

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
