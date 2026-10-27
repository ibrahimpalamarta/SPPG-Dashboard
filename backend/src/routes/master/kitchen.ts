import { Router } from 'express';
import { requirePermission } from '../../auth/guard.js';
import { validate } from '../../middleware/validate.js';
import { wrap } from '../../lib/wrap.js';
import { idParam } from '../../schemas/common.js';
import { kitchenCreate, kitchenListQuery, kitchenUpdate } from '../../schemas/kitchen.js';
import {
  createKitchen,
  getKitchen,
  listKitchens,
  updateKitchen,
} from '../../controllers/master/kitchen.js';

export const kitchenRouter = Router();

kitchenRouter.get('/', validate({ query: kitchenListQuery }), wrap(listKitchens()));
kitchenRouter.get('/:id', validate({ params: idParam }), wrap(getKitchen()));

// SCRUM-20/123: Data Reference is read-only for Data Operasional; only PM MBG
// (reference:edit) changes it.
kitchenRouter.post(
  '/',
  requirePermission('reference:edit'),
  validate({ body: kitchenCreate }),
  wrap(createKitchen()),
);
kitchenRouter.patch(
  '/:id',
  requirePermission('reference:edit'),
  validate({ params: idParam, body: kitchenUpdate }),
  wrap(updateKitchen()),
);
