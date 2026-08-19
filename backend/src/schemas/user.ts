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
 * `scopeId: null` clears the scope; the controller rejects a null scope on a
 * DATA_ADMIN, which would otherwise mean "sees nothing".
 */
export const userUpdate = z
  .object({
    role: z.nativeEnum(Role).optional(),
    status: z.nativeEnum(ActiveStatus).optional(),
    scopeId: z
      .union([
        z
          .string()
          .regex(/^\d+$/, 'must be a positive integer id')
          .transform((v) => BigInt(v)),
        z.null(),
      ])
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
