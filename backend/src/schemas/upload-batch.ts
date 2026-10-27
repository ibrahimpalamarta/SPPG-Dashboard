import { z } from 'zod';
import { SourceSystem, UploadDomain, UploadStatus } from '@prisma/client';
import { TEMPLATE_KINDS } from '../lib/templates.js';
import { pageQuery } from '../lib/pagination.js';
import { dateRangeFields, optionalBigInt, refineDateRange } from './common.js';

export const templateParam = z.object({ kind: z.enum(TEMPLATE_KINDS) });

export const uploadBatchListQuery = refineDateRange(
  pageQuery.extend({
    ...dateRangeFields,
    kitchenId: optionalBigInt,
    domain: z.nativeEnum(UploadDomain).optional(),
    status: z.nativeEnum(UploadStatus).optional(),
  }),
);

/**
 * SCRUM-5/22. The workbook itself arrives as `multipart/form-data`, so
 * everything here is a form field and every value is a string.
 *
 * `fileName`, `fileHash`, `fileSize` and `rowCount` are never accepted from the
 * client: the server has the bytes, so it takes those from the file itself.
 */
export const uploadBatchCreate = z.object({
  kitchenId: z
    .string()
    .regex(/^\d+$/, 'must be a positive integer id')
    .transform((v) => BigInt(v)),
  domain: z.nativeEnum(UploadDomain),
  sourceSystem: z.nativeEnum(SourceSystem).default(SourceSystem.INTERNAL),
  // TODO(OD): which domains *require* a period is not decided yet; optional
  // for all of them until it is.
  period: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'must be YYYY-MM')
    .nullish(),
  notes: z.string().max(2000).nullish(),
  /** SCRUM-124: public id of the quarantined batch this file re-uploads; it ends "Diganti". */
  replaces: z.string().uuid().optional(),
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

/**
 * SCRUM-22: the review step. Only the states a reviewer may set by hand;
 * PROCESSING / NEEDS_MAPPING_UPDATE are set by the pipeline and PUBLISHED by
 * the publish flow. Whether the move is legal from the current state is
 * checked against `upload-status.ts` in the controller.
 */
export const uploadBatchUpdate = z
  .object({
    status: z
      .enum([UploadStatus.NEEDS_REVIEW, UploadStatus.READY, UploadStatus.FAILED])
      .optional(),
    notes: z.string().max(2000).nullish(),
  })
  .refine((v) => v.status !== undefined || v.notes !== undefined, {
    message: 'nothing to update',
    path: ['status'],
  });
