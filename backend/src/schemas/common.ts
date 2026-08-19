import { z } from 'zod';

/** Path ids travel as decimal strings because BigInt has no JSON form. */
const bigIntId = z
  .string()
  .regex(/^\d+$/, 'must be a positive integer id')
  .transform((v) => BigInt(v));

export const idParam = z.object({ id: bigIntId });

/** Public routes key on the UUID, never on the sequential BigInt. */
export const publicIdParam = z.object({ publicId: z.string().uuid() });

/** Optional BigInt arriving from a query string or JSON body. */
export const optionalBigInt = z
  .string()
  .regex(/^\d+$/, 'must be a positive integer id')
  .transform((v) => BigInt(v))
  .optional();

/**
 * Raw shape rather than a schema, so callers can `.extend()` it into their own
 * ZodObject. Intersecting a schema instead would produce a ZodIntersection,
 * which strips keys unpredictably once either side carries a `.refine()`.
 */
export const dateRangeFields = {
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
};

/** `?dateFrom=…&dateTo=…` both inclusive; attach to any schema using them. */
export function refineDateRange<T extends z.ZodTypeAny>(schema: T) {
  return schema.refine(
    (v: unknown) => {
      const { dateFrom, dateTo } = (v ?? {}) as { dateFrom?: Date; dateTo?: Date };
      return !dateFrom || !dateTo || dateFrom <= dateTo;
    },
    { message: 'dateFrom must not be after dateTo', path: ['dateFrom'] },
  );
}

/** Prisma `gte`/`lte` fragment, or undefined when neither bound was given. */
export function dateFilter(dateFrom?: Date, dateTo?: Date) {
  if (!dateFrom && !dateTo) return undefined;
  return { ...(dateFrom && { gte: dateFrom }), ...(dateTo && { lte: dateTo }) };
}
