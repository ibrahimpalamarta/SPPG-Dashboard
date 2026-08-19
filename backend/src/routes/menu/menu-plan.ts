import { Router } from 'express';
import { requireRole } from '../../auth/guard.js';
import { validate } from '../../middleware/validate.js';
import { wrap } from '../../lib/wrap.js';
import { idParam } from '../../schemas/common.js';
import { menuPlanListQuery } from '../../schemas/menu-plan.js';
import {
  getMenuPlan,
  listMenuPlans,
  listRecipeCostings,
} from '../../controllers/menu/menu-plan.js';
import { COST_ROLES } from '../../lib/visibility.js';

export const menuPlanRouter = Router();

// Read-only: rows land here through the Excel import, not through the API.
menuPlanRouter.get('/', validate({ query: menuPlanListQuery }), wrap(listMenuPlans()));
menuPlanRouter.get('/:id', validate({ params: idParam }), wrap(getMenuPlan()));

// SCRUM-13: the costing table is internal-only end to end, so the guard sits
// on the route rather than on individual columns.
menuPlanRouter.get(
  '/:id/recipe-costings',
  requireRole(...COST_ROLES),
  validate({ params: idParam }),
  wrap(listRecipeCostings()),
);
