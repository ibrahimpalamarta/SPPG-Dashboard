import { z } from 'zod';
import { ActiveStatus, Role } from '@prisma/client';
import { pageQuery } from '../lib/pagination.js';
import { PERMISSIONS } from '../auth/roles.js';
import { dateRangeFields, optionalBigInt, refineDateRange } from './common.js';

export const userListQuery = pageQuery.extend({
  role: z.nativeEnum(Role).optional(),
  status: z.nativeEnum(ActiveStatus).optional(),
  search: z.string().min(1).max(160).optional(),
});

/**
 * `kitchenIds` replaces the whole set; `[]` clears it (all kitchens for a
 * non-DATA_ADMIN). The controller rejects an empty set on a DATA_ADMIN, which
 * would otherwise mean "sees nothing".
 */
const kitchenIds = z
  .array(
    z
      .string()
      .regex(/^\d+$/, 'must be a positive integer id')
      .transform((v) => BigInt(v)),
  )
  .max(50)
  // Duplicates would trip the composite PK as a 500.
  .transform((ids) => [...new Set(ids)]);

export const userUpdate = z
  .object({
    fullName: z.string().trim().min(1).max(160).optional(),
    role: z.nativeEnum(Role).optional(),
    status: z.nativeEnum(ActiveStatus).optional(),
    kitchenIds: kitchenIds.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'nothing to update', path: ['role'] });

/**
 * A new account starts with no password; the response carries a one-time
 * set-password token instead (there is no outbound email yet). The role is
 * explicit — a new user is never admin by default.
 */
export const userCreate = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  fullName: z.string().trim().min(1).max(160),
  role: z.nativeEnum(Role),
  kitchenIds: kitchenIds.default([]),
});

export const rolePermissionsBody = z.object({
  permissions: z
    .array(z.enum(PERMISSIONS))
    .max(PERMISSIONS.length)
    .transform((p) => [...new Set(p)]),
});

export const roleParam = z.object({ role: z.nativeEnum(Role) });

export const auditLogListQuery = refineDateRange(
  pageQuery.extend({
    ...dateRangeFields,
    userId: optionalBigInt,
    entity: z.string().min(1).max(120).optional(),
    action: z.string().min(1).max(120).optional(),
  }),
);
