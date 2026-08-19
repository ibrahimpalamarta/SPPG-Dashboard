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
 * SCRUM-5. The workbook itself arrives as `multipart/form-data`, so everything
 * here is a form field and every value is a string.
 *
 * `fileName`, `fileHash` and `rowCount` are no longer accepted from the client:
 * the server has the bytes now, so it takes those from the file itself. A
 * caller can no longer register a batch whose hash does not match its contents.
 */
export const uploadBatchCreate = z.object({
  kitchenId: z
    .string()
    .regex(/^\d+$/, 'must be a positive integer id')
    .transform((v) => BigInt(v)),
  notes: z.string().max(2000).nullish(),
});

/**
 * SCRUM-6 AC1. `?dryRun=true` parses the workbook and reports its columns, row
 * count and errors without writing a single row.
 *
 * ponytail: preview and import are the same endpoint because the alternative —
 * staging the file server-side and confirming it later — needs stored state and
 * an expiry policy. The cost is that the client uploads twice; for a workbook
 * this size that is cheaper than owning a staging area.
 */
export const uploadBatchCreateQuery = z.object({
  dryRun: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
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
