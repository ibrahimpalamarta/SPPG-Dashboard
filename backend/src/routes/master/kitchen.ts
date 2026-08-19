import { Router } from 'express';
import { requireRole } from '../../auth/guard.js';
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

// SCRUM-15: the kitchen master is Super Admin territory.
kitchenRouter.post(
  '/',
  requireRole('SUPER_ADMIN'),
  validate({ body: kitchenCreate }),
  wrap(createKitchen()),
);
kitchenRouter.patch(
  '/:id',
  requireRole('SUPER_ADMIN'),
  validate({ params: idParam, body: kitchenUpdate }),
  wrap(updateKitchen()),
);
