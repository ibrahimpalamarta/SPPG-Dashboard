import { z } from 'zod';
import { pageQuery } from '../lib/pagination.js';

export const ingredientListQuery = pageQuery.extend({
  search: z.string().min(1).max(120).optional(),
});

/** Nutrition per 100 g of raw ingredient; all optional because the canonical
 * ingredient list is still being reconciled (~443 spellings -> ~370 rows). */
const ingredientFields = {
  name: z.string().min(1).max(160),
  aliases: z.array(z.string().min(1).max(160)).optional(),
  bddPct: z.coerce.number().min(0).max(100).nullish(),
  energiPer100g: z.coerce.number().min(0).nullish(),
  proteinPer100g: z.coerce.number().min(0).nullish(),
  lemakPer100g: z.coerce.number().min(0).nullish(),
  karbohidratPer100g: z.coerce.number().min(0).nullish(),
  seratPer100g: z.coerce.number().min(0).nullish(),
};

export const ingredientCreate = z.object(ingredientFields);
export const ingredientUpdate = z.object(ingredientFields).partial();
