import { Router } from 'express';
import { requireRole } from '../../auth/guard.js';
import { validate } from '../../middleware/validate.js';
import { wrap } from '../../lib/wrap.js';
import { idParam } from '../../schemas/common.js';
import {
  ingredientCreate,
  ingredientListQuery,
  ingredientUpdate,
} from '../../schemas/ingredient.js';
import {
  createIngredient,
  getIngredient,
  listIngredients,
  updateIngredient,
} from '../../controllers/master/ingredient.js';

export const ingredientRouter = Router();

ingredientRouter.get('/', validate({ query: ingredientListQuery }), wrap(listIngredients()));
ingredientRouter.get('/:id', validate({ params: idParam }), wrap(getIngredient()));

ingredientRouter.post(
  '/',
  requireRole('SUPER_ADMIN', 'DATA_ADMIN'),
  validate({ body: ingredientCreate }),
  wrap(createIngredient()),
);
ingredientRouter.patch(
  '/:id',
  requireRole('SUPER_ADMIN', 'DATA_ADMIN'),
  validate({ params: idParam, body: ingredientUpdate }),
  wrap(updateIngredient()),
);
