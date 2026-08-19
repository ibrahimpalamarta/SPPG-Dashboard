import { z } from 'zod';
import { UploadStatus } from '@prisma/client';
import { pageQuery } from '../lib/pagination.js';
import { dateRangeFields, optionalBigInt, refineDateRange } from './common.js';

export const uploadBatchListQuery = refineDateRange(
  pageQuery.extend({
    ...dateRangeFields,
    kitchenId: optionalBigInt,
    status: z.nativeEnum(UploadStatus).optional(),
  }),
);

/**
 * SCRUM-5/6. The client hashes the file it is about to send and registers the
 * batch first; `file_hash` is UNIQUE in Postgres, so an identical re-import
 * collides at the database rather than relying on the application to remember.
 *
 * Parsing the workbook into menu_plans is a separate phase — this endpoint
 * records the batch, not its rows.
 */
export const uploadBatchCreate = z.object({
  kitchenId: z
    .string()
    .regex(/^\d+$/, 'must be a positive integer id')
    .transform((v) => BigInt(v)),
  fileName: z.string().min(1).max(255),
  fileHash: z.string().regex(/^[a-f0-9]{64}$/i, 'must be a hex sha256 digest'),
  rowCount: z.coerce.number().int().min(0),
  notes: z.string().max(2000).nullish(),
});

/** SCRUM-5: the verification outcome. PROCESSING is the initial state and
 * cannot be set again from outside. */
export const uploadBatchUpdate = z
  .object({
    status: z.enum([UploadStatus.DITERIMA, UploadStatus.DITOLAK]).optional(),
    notes: z.string().max(2000).nullish(),
  })
  .refine((v) => v.status !== undefined || v.notes !== undefined, {
    message: 'nothing to update',
    path: ['status'],
  });
