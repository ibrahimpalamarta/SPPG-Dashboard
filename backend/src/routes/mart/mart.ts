import { Router } from 'express';
import { requirePermission, requireRole } from '../../auth/guard.js';
import { validate } from '../../middleware/validate.js';
import { wrap } from '../../lib/wrap.js';
import { COST_ROLES } from '../../lib/visibility.js';
import {
  akgComplianceQuery,
  completenessQuery,
  dailyKitchenQuery,
  dashboardQuery,
  menuCostQuery,
  menuKpiQuery,
  menuNutritionQuery,
  summaryQuery,
} from '../../schemas/mart.js';
import {
  listAkgCompliances,
  listDailyKitchens,
  listMenuCosts,
  listMenuNutritions,
  listSummaries,
} from '../../controllers/mart/mart.js';
import { getDashboardSummary } from '../../controllers/mart/dashboard.js';
import { getFinanceKpi, getMenuKpi } from '../../controllers/mart/kpi.js';
import { getCompleteness } from '../../controllers/mart/completeness.js';

/**
 * Pre-computed marts, all read-only. Each router is mounted separately in
 * routes/index.ts so the URLs stay flat (/api/menu-nutritions, not
 * /api/marts/menu-nutritions).
 */
export const menuNutritionRouter = Router();
menuNutritionRouter.get('/', validate({ query: menuNutritionQuery }), wrap(listMenuNutritions()));

export const dailyKitchenRouter = Router();
dailyKitchenRouter.get('/', validate({ query: dailyKitchenQuery }), wrap(listDailyKitchens()));

export const akgComplianceRouter = Router();
akgComplianceRouter.get('/', validate({ query: akgComplianceQuery }), wrap(listAkgCompliances()));

// SCRUM-13: menu_costs is internal-only in full, so the guard closes the whole
// resource instead of stripping columns.
export const menuCostRouter = Router();
menuCostRouter.get(
  '/',
  requireRole(...COST_ROLES),
  validate({ query: menuCostQuery }),
  wrap(listMenuCosts()),
);

export const summaryRouter = Router();
summaryRouter.get('/', validate({ query: summaryQuery }), wrap(listSummaries()));

export const dashboardRouter = Router();
dashboardRouter.get('/summary', validate({ query: dashboardQuery }), wrap(getDashboardSummary()));

// SCRUM-62..76, 97..116: KPIs read published canonical data only. Money is cost-cleared as a whole.
export const kpiRouter = Router();
kpiRouter.use(requirePermission('dashboard:view'));
kpiRouter.get('/finance', requireRole(...COST_ROLES), validate({ query: dashboardQuery }), wrap(getFinanceKpi()));
kpiRouter.get('/menu', validate({ query: menuKpiQuery }), wrap(getMenuKpi()));
kpiRouter.get('/completeness', validate({ query: completenessQuery }), wrap(getCompleteness()));
