import type { RequestHandler } from 'express';
import { createHash } from 'node:crypto';
import type { z } from 'zod';
import { Prisma, UploadDomain, UploadStatus } from '@prisma/client';
import { prisma, type Db } from '../../db.js';
import { sendError } from '../../middleware/error-handler.js';
import { sendJson } from '../../lib/serialize.js';
import { pageArgs, paginated } from '../../lib/pagination.js';
import { kitchenScope, kitchenWhere } from '../../lib/scope.js';
import { parseMenuWorkbook } from '../../lib/menu-workbook.js';
import { XLSX_MIME, putObject, type PutObject } from '../../lib/s3.js';
import { dateFilter } from '../../schemas/common.js';
import { writeAuditLog } from '../../auth/audit.js';
import { trackEvent } from '../../lib/events.js';
import { canTransition } from '../../lib/upload-status.js';
import { WorkbookError, assertXlsxContainer } from '../../lib/ingest/workbook.js';
import { parseToStaging } from '../../lib/ingest/pipeline.js';
import { stagingRepository, type StagingRepository } from '../../lib/ingest/staging.js';
import type {
  uploadBatchCreate,
  uploadBatchCreateQuery,
  uploadBatchListQuery,
  uploadBatchUpdate,
} from '../../schemas/upload-batch.js';

/** Uploader is joined in because SCRUM-7 lists it as a column of the history
 * table; the raw uploader_id would force the client into a second request. */
const withUploader = {
  uploader: { select: { id: true, email: true, fullName: true } },
  kitchen: { select: { id: true, code: true, name: true } },
} satisfies Prisma.UploadBatchInclude;

/** SCRUM-7: upload history. */
export const listUploadBatches = (db: Db = prisma): RequestHandler => async (req, res) => {
  const q = req.valid!.query as z.infer<typeof uploadBatchListQuery>;
  const scope = kitchenScope(req.user!, q.kitchenId);
  if (!scope.ok) {
    sendError(res, 'FORBIDDEN_KITCHEN');
    return;
  }

  const uploadDate = dateFilter(q.dateFrom, q.dateTo);
  const where: Prisma.UploadBatchWhereInput = {
    ...kitchenWhere(scope),
    ...(q.status && { status: q.status }),
    ...(q.domain && { domain: q.domain }),
    ...(uploadDate && { uploadDate }),
  };

  const [rows, total] = await Promise.all([
    db.uploadBatch.findMany({
      where,
      include: withUploader,
      orderBy: { uploadDate: 'desc' },
      ...pageArgs(q),
    }),
    db.uploadBatch.count({ where }),
  ]);

  sendJson(res, paginated(rows, total, q));
};

export const getUploadBatch = (db: Db = prisma): RequestHandler => async (req, res) => {
  const { id } = req.valid!.params as { id: bigint };
  const row = await db.uploadBatch.findUnique({ where: { id }, include: withUploader });
  if (!row) {
    sendError(res, 'NOT_FOUND');
    return;
  }
  // Scope is checked after the read: the row must exist before we can know
  // which kitchen it belongs to. A cross-tenant read still returns 403.
  const scope = kitchenScope(req.user!, row.kitchenId);
  if (!scope.ok) {
    sendError(res, 'FORBIDDEN_KITCHEN');
    return;
  }
  sendJson(res, row);
};

/** Rows returned by a dry run. Enough to eyeball the mapping, not the file. */
const PREVIEW_ROWS = 50;

/**
 * The S3 key is built from the batch's public id, never from the original file
 * name (SCRUM-22 security note): one object per attempt, nothing user-supplied
 * in the path.
 */
export const uploadKey = (publicId: string): string => `upload-batches/${publicId}.xlsx`;

/** PRD §9 copy for a file no mapping profile recognises. */
const NOT_RECOGNISED = 'Format file belum dikenali untuk kitchen/source ini. File belum dipublish.';

/**
 * SCRUM-22/37 + SCRUM-24. Takes the workbook (multipart, field `file`), opens
 * a batch, stores the original and parses every sheet into staging. Nothing
 * is published or written to canonical tables here.
 *
 *   - every attempt is its own batch, failed ones included; an identical
 *     earlier file for the same kitchen + domain only adds a `warning`
 *     (duplicates are stopped at publish, not at upload)
 *   - a file that is not an .xlsx container (renamed, password-protected) is
 *     FAILED and never stored; a corrupt or empty workbook is FAILED with no
 *     staged rows left behind
 *   - a parsed file ends NEEDS_MAPPING_UPDATE until profile detection
 *     (SCRUM-39) exists — never READY, so it can never publish
 *   - a storage failure marks the batch FAILED instead of leaving it PROCESSING
 *
 * ponytail: synchronous within the request, like the rest of the repo; the
 * UPLOAD_MAX_BYTES cap (10 MB) keeps that bounded. Move to a queue if real
 * files start timing out the ALB.
 */
export const createUploadBatch =
  (db: Db = prisma, put: PutObject = putObject, staging: StagingRepository = stagingRepository): RequestHandler =>
  async (req, res) => {
    const started = Date.now();
    const body = req.valid!.body as z.infer<typeof uploadBatchCreate>;
    const { dryRun } = req.valid!.query as z.infer<typeof uploadBatchCreateQuery>;
    const scope = kitchenScope(req.user!, body.kitchenId);
    if (!scope.ok) {
      sendError(res, 'FORBIDDEN_KITCHEN');
      return;
    }

    const { buffer, originalname, size } = req.file!;
    const fileHash = createHash('sha256').update(buffer).digest('hex');

    // SCRUM-6 AC1: parse and report, nothing written. Menu only until the
    // staging parsers (SCRUM-24/36) replace this preview.
    if (dryRun) {
      try {
        assertXlsxContainer(buffer);
      } catch (err) {
        if (!(err instanceof WorkbookError)) throw err;
        sendError(res, 'VALIDATION_ERROR', { fields: { file: [err.message] } });
        return;
      }
      if (body.domain !== UploadDomain.MENU) {
        sendError(res, 'VALIDATION_ERROR', { fields: { dryRun: ['only available for MENU'] } });
        return;
      }
      const { columns, rows, errors } = await parseMenuWorkbook(buffer);
      sendJson(res, {
        fileName: originalname,
        fileHash,
        columns,
        rowCount: rows.length,
        errors,
        rows: rows.slice(0, PREVIEW_ROWS),
      });
      return;
    }

    const kitchen = await db.kitchen.findUnique({ where: { id: body.kitchenId } });
    if (!kitchen) {
      sendError(res, 'VALIDATION_ERROR', { fields: { kitchenId: ['no kitchen with that id'] } });
      return;
    }

    const duplicate = await db.uploadBatch.findFirst({
      where: { kitchenId: body.kitchenId, domain: body.domain, fileHash },
      orderBy: { uploadDate: 'desc' },
      select: { publicId: true },
    });

    const event = {
      user_role: req.user!.role,
      kitchen_id: String(body.kitchenId),
      domain: body.domain,
    };
    trackEvent('upload_started', event);

    const batch = await db.uploadBatch.create({
      data: {
        kitchenId: body.kitchenId,
        uploaderId: req.user!.id,
        domain: body.domain,
        sourceSystem: body.sourceSystem,
        period: body.period ?? null,
        fileName: originalname,
        fileHash,
        fileSize: size,
        notes: body.notes ?? null,
      },
    });
    const done = { ...event, batch_id: batch.publicId };

    const finish = (data: Prisma.UploadBatchUncheckedUpdateInput) =>
      db.uploadBatch.update({
        where: { id: batch.id },
        data: { ...data, durationMs: Date.now() - started },
        include: withUploader,
      });

    let sheets: unknown[] = [];
    const ingest = async () => {
      try {
        assertXlsxContainer(buffer);
      } catch (err) {
        if (!(err instanceof WorkbookError)) throw err;
        // Not stored: a renamed or encrypted file has no business in the bucket.
        return finish({ status: UploadStatus.FAILED, errorCode: err.code, errorSummary: err.message });
      }

      const storageKey = uploadKey(batch.publicId);
      try {
        await put(storageKey, buffer, XLSX_MIME);
      } catch (err) {
        await finish({
          status: UploadStatus.FAILED,
          errorCode: 'STORAGE_FAILED',
          errorSummary: 'File gagal disimpan. Silakan upload ulang.',
        });
        trackEvent('upload_failed', { ...done, status: UploadStatus.FAILED, error_code: 'STORAGE_FAILED' });
        throw err;
      }

      const parsed = await parseToStaging(
        buffer,
        {
          uploadBatchId: batch.publicId,
          // Turen has no code yet (B-TUREN); its numeric id is just as stable.
          kitchenCode: kitchen.code ?? String(kitchen.id),
          domain: body.domain,
          sourceSystem: body.sourceSystem,
          sourceFileName: originalname,
          fileHash,
          loadedAt: new Date(),
        },
        staging,
      );
      if (!parsed.ok) {
        return finish({ storageKey, status: UploadStatus.FAILED, errorCode: parsed.errorCode, errorSummary: parsed.errorSummary });
      }

      sheets = parsed.batch.sheets;
      return finish({
        storageKey,
        rowCount: parsed.batch.rows.length,
        // diisi di SCRUM-39: profile detection decides between NEEDS_REVIEW
        // and NEEDS_MAPPING_UPDATE.
        status: UploadStatus.NEEDS_MAPPING_UPDATE,
        errorCode: 'PROFILE_NOT_DETECTED',
        errorSummary: NOT_RECOGNISED,
      });
    };
    const row = await ingest();

    await writeAuditLog(db, {
      userId: req.user!.id,
      action: 'upload_batch.created',
      entity: 'upload_batches',
      entityId: row.id,
      metadata: {
        fileName: row.fileName,
        kitchenId: String(row.kitchenId),
        domain: row.domain,
        status: row.status,
      },
    });
    trackEvent(row.status === UploadStatus.FAILED ? 'upload_failed' : 'upload_completed', {
      ...done,
      rows: row.rowCount,
      duration: row.durationMs,
      status: row.status,
      error_code: row.errorCode,
    });

    // `sheets` (names, header row, headers, row counts) is not persisted yet
    // (B-SCHEMA); it rides on the response so the upload page can show it.
    sendJson(
      res,
      {
        ...row,
        sheets,
        ...(duplicate && {
          warning: {
            code: 'DUPLICATE_FILE',
            message: `File identik sudah pernah diupload (batch ${duplicate.publicId}).`,
            duplicateOf: duplicate.publicId,
          },
        }),
      },
      201,
    );
  };

/**
 * Review step: move a batch along the state machine (SCRUM-22). Only the
 * transitions in `upload-status.ts` are accepted; PUBLISHED is not reachable
 * from here — that belongs to the publish flow (SCRUM-95).
 */
export const updateUploadBatch = (db: Db = prisma): RequestHandler => async (req, res) => {
  const { id } = req.valid!.params as { id: bigint };
  const body = req.valid!.body as z.infer<typeof uploadBatchUpdate>;

  const current = await db.uploadBatch.findUnique({ where: { id } });
  if (!current) {
    sendError(res, 'NOT_FOUND');
    return;
  }
  const scope = kitchenScope(req.user!, current.kitchenId);
  if (!scope.ok) {
    sendError(res, 'FORBIDDEN_KITCHEN');
    return;
  }
  if (body.status && !canTransition(current.status, body.status)) {
    sendError(res, 'INVALID_TRANSITION', { from: current.status, to: body.status });
    return;
  }

  const row = await db.uploadBatch.update({
    where: { id },
    data: {
      ...(body.status && { status: body.status }),
      ...(body.notes !== undefined && { notes: body.notes ?? null }),
    },
    include: withUploader,
  });

  await writeAuditLog(db, {
    userId: req.user!.id,
    action: 'upload_batch.reviewed',
    entity: 'upload_batches',
    entityId: row.id,
    metadata: { from: current.status, to: row.status },
  });

  sendJson(res, row);
};
