import { z } from 'zod';
import { ActiveStatus, Role } from '@prisma/client';
import { pageQuery } from '../lib/pagination.js';
import { dateRangeFields, optionalBigInt, refineDateRange } from './common.js';

export const userListQuery = pageQuery.extend({
  role: z.nativeEnum(Role).optional(),
  status: z.nativeEnum(ActiveStatus).optional(),
  search: z.string().min(1).max(160).optional(),
});

/**
 * Auth0 owns identity, so email / fullName / auth0Sub are not editable here —
 * findOrCreateUser overwrites them on the next login. Only the authorization
 * columns this API actually enforces against are settable.
 *
 * `kitchenIds` replaces the whole set; `[]` clears it (all kitchens for a
 * non-DATA_ADMIN). The controller rejects an empty set on a DATA_ADMIN, which
 * would otherwise mean "sees nothing".
 */
export const userUpdate = z
  .object({
    role: z.nativeEnum(Role).optional(),
    status: z.nativeEnum(ActiveStatus).optional(),
    kitchenIds: z
      .array(
        z
          .string()
          .regex(/^\d+$/, 'must be a positive integer id')
          .transform((v) => BigInt(v)),
      )
      .max(50)
      // Duplicates would trip the composite PK as a 500.
      .transform((ids) => [...new Set(ids)])
      .optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'nothing to update', path: ['role'] });

export const auditLogListQuery = refineDateRange(
  pageQuery.extend({
    ...dateRangeFields,
    userId: optionalBigInt,
    entity: z.string().min(1).max(120).optional(),
    action: z.string().min(1).max(120).optional(),
  }),
);
