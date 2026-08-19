import { z } from 'zod';
import { PortionClass } from '@prisma/client';
import { pageQuery } from '../lib/pagination.js';
import { dateRangeFields, refineDateRange } from './common.js';

/**
 * Public queries key on kitchen `publicId` (UUID), never on the sequential
 * BigInt — the point of the public_id column is that outsiders cannot
 * enumerate rows.
 */
export const publicNutritionQuery = refineDateRange(
  pageQuery.extend({
    ...dateRangeFields,
    kitchen: z.string().uuid().optional(),
    portionClass: z.nativeEnum(PortionClass).optional(),
  }),
);

export const publicContentQuery = pageQuery.extend({
  category: z.string().min(1).max(120).optional(),
});
