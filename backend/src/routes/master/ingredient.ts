import { Router } from 'express';
import { requirePermission } from '../../auth/guard.js';
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

// SCRUM-20/123: Data Reference is read-only for Data Operasional; only Admin
// (reference:edit) changes it.
ingredientRouter.post(
  '/',
  requirePermission('reference:edit'),
  validate({ body: ingredientCreate }),
  wrap(createIngredient()),
);
ingredientRouter.patch(
  '/:id',
  requirePermission('reference:edit'),
  validate({ params: idParam, body: ingredientUpdate }),
  wrap(updateIngredient()),
);
