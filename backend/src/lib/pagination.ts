import { z } from 'zod';

/** Capped at 100: a menu_plans page is one row per ingredient, so an
 * uncapped pageSize is an easy way to pull the whole table in one request. */
export const pageQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25),
});

export type PageQuery = z.infer<typeof pageQuery>;

export interface Paginated<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

/** Prisma skip/take from a page number. */
export function pageArgs({ page, pageSize }: PageQuery) {
  return { skip: (page - 1) * pageSize, take: pageSize };
}

/**
 * List endpoints wrap their rows; single-resource endpoints return the bare
 * object (as /api/me already does). The envelope exists because the frontend
 * cannot render a pager without `total`.
 */
export function paginated<T>(data: T[], total: number, { page, pageSize }: PageQuery): Paginated<T> {
  return {
    data,
    meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}
