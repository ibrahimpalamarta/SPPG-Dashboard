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
const cells = z.record(z.string().regex(/^[A-Z]{1,3}$/, 'must be a column letter'), z.string().max(1000));
const rowRef = { sheet: z.string().max(100), row: z.number().int().positive() };

/** "Validasi Data" grid: cells the uploader changed, rows removed and rows added, applied to the file before it is parsed. */
export const rowEditsSchema = z.object({
  update: z.array(z.object({ ...rowRef, cells })).max(20_000).default([]),
  remove: z.array(z.object(rowRef)).max(20_000).default([]),
  add: z.array(z.object({ sheet: rowRef.sheet, cells })).max(2_000).default([]),
});

/** A multipart field holding JSON, checked against `schema`. */
const jsonField = <S extends z.ZodTypeAny>(schema: S, message: string) =>
  z
    .string()
    .optional()
    .transform((v, ctx): z.infer<S> | undefined => {
      if (!v) return undefined;
      try {
        return schema.parse(JSON.parse(v));
      } catch {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message });
        return z.NEVER;
      }
    });

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
  /** "Ubah Mapping": JSON object `sheet|column letter` → canonical field ("" = not used). */
  columnMap: jsonField(z.record(z.string()), 'must be a JSON object of strings'),
  /** JSON `RowEdits`: what the uploader changed in the "Validasi Data" grid. */
  rowEdits: jsonField(rowEditsSchema, 'must be a JSON object of row edits'),
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

/** Dev clean-up only: `?force=true` also deletes PUBLISHED batches (refused when NODE_ENV is production unless ALLOW_DEV_DELETE is set). */
export const uploadBatchDeleteQuery = z.object({
  force: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
});

/**
 * SCRUM-22: the states Data Operasional may set by hand; PROCESSING /
 * NEEDS_MAPPING_UPDATE are set by the pipeline and PUBLISHED by the publish
 * flow. Whether the move is legal from the current state is checked against
 * `upload-status.ts` in the controller.
 */
export const uploadBatchUpdate = z
  .object({
    status: z
      .enum([UploadStatus.NEEDS_REVIEW, UploadStatus.FAILED])
      .optional(),
    notes: z.string().max(2000).nullish(),
  })
  .refine((v) => v.status !== undefined || v.notes !== undefined, {
    message: 'nothing to update',
    path: ['status'],
  });
