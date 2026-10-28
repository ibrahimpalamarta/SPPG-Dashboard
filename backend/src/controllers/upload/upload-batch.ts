import type { Request, RequestHandler, Response } from 'express';
import { createHash } from 'node:crypto';
import type { z } from 'zod';
import { Prisma, UploadStatus } from '@prisma/client';
import { prisma, type Db } from '../../db.js';
import { sendError } from '../../middleware/error-handler.js';
import { sendJson } from '../../lib/serialize.js';
import { pageArgs, paginated, type PageQuery } from '../../lib/pagination.js';
import { kitchenScope, kitchenWhere } from '../../lib/scope.js';
import { CSV_MIME, XLSX_MIME, deleteObject, getObject, putObject, type DeleteObject, type GetObject, type PutObject } from '../../lib/s3.js';
import { dateFilter } from '../../schemas/common.js';
import { writeAuditLog } from '../../auth/audit.js';
import { trackEvent } from '../../lib/events.js';
import { buildTemplate, type TemplateKind } from '../../lib/templates.js';
import { canTransition } from '../../lib/upload-status.js';
import { WorkbookError, assertReadable, isCsv } from '../../lib/ingest/workbook.js';
import { parseToStaging, type MappingSummary } from '../../lib/ingest/pipeline.js';
import type { ColumnDiff } from '../../lib/mapping/detect.js';
import { InMemoryStagingRepository, PrismaStagingRepository, type StagedSheet, type StagingRepository } from '../../lib/ingest/staging.js';
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
      // Issues can run to thousands per batch; read them from GET /:id.
      omit: { mappingResult: true },
      orderBy: { uploadDate: 'desc' },
      ...pageArgs(q),
    }),
    db.uploadBatch.count({ where }),
  ]);

  sendJson(res, paginated(rows, total, q));
};

/** SCRUM-125: the official empty template; every role that can see uploads may download it. */
export const downloadTemplate = (): RequestHandler => async (req, res) => {
  const { kind } = req.valid!.params as { kind: TemplateKind };
  res.setHeader('Content-Type', XLSX_MIME);
  res.setHeader('Content-Disposition', `attachment; filename="template-${kind}-v1.xlsx"`);
  res.send(await buildTemplate(kind));
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

/** The batch in the caller's dapur, or null once a 404/403 has been sent. */
async function scopedBatch(db: Db, req: Request, res: Response) {
  const { id } = req.valid!.params as { id: bigint };
  const row = await db.uploadBatch.findUnique({ where: { id }, select: { id: true, publicId: true, kitchenId: true } });
  if (!row) {
    sendError(res, 'NOT_FOUND');
    return null;
  }
  if (!kitchenScope(req.user!, row.kitchenId).ok) {
    sendError(res, 'FORBIDDEN_KITCHEN');
    return null;
  }
  return row;
}

/** Validasi Data "Hasil data": the mapped Cashflow transactions with their lines. Other domains have none here yet. */
export const listUploadBatchRecords = (db: Db = prisma): RequestHandler => async (req, res) => {
  const batch = await scopedBatch(db, req, res);
  if (!batch) return;
  const q = req.valid!.query as PageQuery;
  const where = { uploadBatchId: batch.publicId };
  const [rows, total] = await Promise.all([
    db.financeTransaction.findMany({
      where,
      include: { lines: { orderBy: { id: 'asc' } } },
      orderBy: [{ txnDate: 'asc' }, { txnId: 'asc' }],
      ...pageArgs(q),
    }),
    db.financeTransaction.count({ where }),
  ]);
  sendJson(res, paginated(rows, total, q));
};

/** Validasi Data "Riwayat": the batch's audit trail, oldest first. */
export const listUploadBatchHistory = (db: Db = prisma): RequestHandler => async (req, res) => {
  const batch = await scopedBatch(db, req, res);
  if (!batch) return;
  const rows = await db.auditLog.findMany({
    where: { entity: 'upload_batches', entityId: batch.id },
    include: { user: { select: { id: true, email: true, fullName: true } } },
    orderBy: { timestamp: 'asc' },
  });
  sendJson(res, rows);
};

/** Upload history "Export": the original file as stored, nothing regenerated. */
export const downloadUploadBatchFile = (db: Db = prisma, get: GetObject = getObject): RequestHandler => async (req, res) => {
  const { id } = req.valid!.params as { id: bigint };
  const row = await db.uploadBatch.findUnique({ where: { id } });
  if (!row?.storageKey) {
    sendError(res, 'NOT_FOUND');
    return;
  }
  if (!kitchenScope(req.user!, row.kitchenId).ok) {
    sendError(res, 'FORBIDDEN_KITCHEN');
    return;
  }
  res.setHeader('Content-Type', isCsv(row.fileName) ? CSV_MIME : XLSX_MIME);
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(row.fileName)}`);
  res.send(await get(row.storageKey));
};

/**
 * Dev clean-up: hard-deletes a batch, its staging rows and menu plans (FK
 * cascade) and the stored original. PUBLISHED is refused — canonical data was
 * built from it and does not cascade.
 */
export const deleteUploadBatch = (db: Db = prisma, remove: DeleteObject = deleteObject): RequestHandler => async (req, res) => {
  const { id } = req.valid!.params as { id: bigint };
  const row = await db.uploadBatch.findUnique({ where: { id } });
  if (!row) {
    sendError(res, 'NOT_FOUND');
    return;
  }
  if (!kitchenScope(req.user!, row.kitchenId).ok) {
    sendError(res, 'FORBIDDEN_KITCHEN');
    return;
  }
  if (row.status === UploadStatus.PUBLISHED) {
    sendError(res, 'CONFLICT', { message: 'Batch yang sudah dipublish tidak bisa dihapus.' });
    return;
  }

  await db.uploadBatch.delete({ where: { id } });
  if (row.storageKey) await remove(row.storageKey);
  await writeAuditLog(db, {
    userId: req.user!.id,
    action: 'upload_batch.deleted',
    entity: 'upload_batches',
    entityId: row.id,
    metadata: { fileName: row.fileName, kitchenId: String(row.kitchenId), domain: row.domain, status: row.status },
  });
  res.status(204).end();
};

/** Rows returned by a dry run. Enough to eyeball the mapping, not the file. */
const PREVIEW_ROWS = 50;

/**
 * The S3 key is built from the batch's public id, never from the original file
 * name (SCRUM-22 security note): one object per attempt, nothing user-supplied
 * in the path.
 */
export const uploadKey = (publicId: string, fileName = ''): string =>
  `upload-batches/${publicId}${isCsv(fileName) ? '.csv' : '.xlsx'}`;

/** PRD §9 copy for a file no mapping profile recognises, plus what is missing (SCRUM-94). */
const notRecognised = (diff: ColumnDiff[]) => {
  const missing = [...new Set(diff.flatMap((d) => d.missing))];
  return `Format file belum dikenali untuk kitchen/source ini. File belum dipublish.${missing.length ? ` Kolom tidak ditemukan: ${missing.join(', ')}.` : ''}`;
};

/**
 * SCRUM-22/37 + SCRUM-24. Takes the workbook (multipart, field `file`), opens
 * a batch, stores the original and parses every sheet into staging. Nothing
 * is published or written to canonical tables here.
 *
 *   - every attempt is its own batch, failed ones included; an identical
 *     earlier non-FAILED file for the same kitchen + domain only adds a `warning`
 *     (duplicates are stopped at publish, not at upload)
 *   - a file that is not the container its extension promises (renamed or
 *     password-protected .xlsx, binary .csv) is
 *     FAILED and never stored; a corrupt or empty workbook is FAILED with no
 *     staged rows left behind
 *   - a parsed file is NEEDS_REVIEW when a mapping profile recognises it
 *     (SCRUM-39), else NEEDS_MAPPING_UPDATE with the column diff — never
 *     READY, so nothing publishes without a reviewer
 *   - `replaces` closes the quarantined batch it re-uploads: FAILED +
 *     REPLACED ("Diganti", SCRUM-124) once the new file has parsed
 *   - a storage failure marks the batch FAILED instead of leaving it PROCESSING
 *
 * ponytail: synchronous within the request, like the rest of the repo; the
 * UPLOAD_MAX_BYTES cap (10 MB) keeps that bounded. Move to a queue if real
 * files start timing out the ALB.
 */
export const createUploadBatch =
  (db: Db = prisma, put: PutObject = putObject, staging: StagingRepository = new PrismaStagingRepository(prisma)): RequestHandler =>
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

    const context = (uploadBatchId: string, kitchenCode: string) => ({
      uploadBatchId,
      kitchenCode,
      domain: body.domain,
      sourceSystem: body.sourceSystem,
      sourceFileName: originalname,
      fileHash,
      loadedAt: new Date(),
    });

    // SCRUM-6 AC1: parse and report, nothing written. Same parser as a real
    // upload (SCRUM-36), into a throwaway repository.
    if (dryRun) {
      const parsed = await parseToStaging(buffer, context('dry-run', String(body.kitchenId)), new InMemoryStagingRepository());
      if (!parsed.ok) {
        sendError(res, 'VALIDATION_ERROR', { fields: { file: [parsed.errorSummary] } });
        return;
      }
      sendJson(res, {
        fileName: originalname,
        fileHash,
        sheets: parsed.batch.sheets,
        rowCount: parsed.batch.rows.length,
        rows: parsed.batch.rows.slice(0, PREVIEW_ROWS),
      });
      return;
    }

    const kitchen = await db.kitchen.findUnique({ where: { id: body.kitchenId } });
    if (!kitchen) {
      sendError(res, 'VALIDATION_ERROR', { fields: { kitchenId: ['no kitchen with that id'] } });
      return;
    }

    const replaced = body.replaces ? await db.uploadBatch.findUnique({ where: { publicId: body.replaces } }) : null;
    if (
      body.replaces &&
      (!replaced || replaced.kitchenId !== body.kitchenId || replaced.domain !== body.domain || !canTransition(replaced.status, UploadStatus.SUPERSEDED))
    ) {
      sendError(res, 'VALIDATION_ERROR', { fields: { replaces: ['not an open batch of this kitchen and domain'] } });
      return;
    }

    const duplicate = await db.uploadBatch.findFirst({
      // FAILED attempts never held the data, so retrying one is not a duplicate.
      where: { kitchenId: body.kitchenId, domain: body.domain, fileHash, status: { not: UploadStatus.FAILED } },
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
        // The response carries it flat below.
        omit: { mappingResult: true },
      });

    let sheets: StagedSheet[] = [];
    let columnDiff: ColumnDiff[] = [];
    let mapping: MappingSummary | null = null;
    const ingest = async () => {
      try {
        assertReadable(buffer, originalname);
      } catch (err) {
        if (!(err instanceof WorkbookError)) throw err;
        // Not stored: a renamed or encrypted file has no business in the bucket.
        return finish({ status: UploadStatus.FAILED, errorCode: err.code, errorSummary: err.message });
      }

      const storageKey = uploadKey(batch.publicId, originalname);
      try {
        await put(storageKey, buffer, isCsv(originalname) ? CSV_MIME : XLSX_MIME);
      } catch (err) {
        await finish({
          status: UploadStatus.FAILED,
          errorCode: 'STORAGE_FAILED',
          errorSummary: 'File gagal disimpan. Silakan upload ulang.',
        });
        trackEvent('upload_failed', { ...done, status: UploadStatus.FAILED, error_code: 'STORAGE_FAILED' });
        throw err;
      }

      // Turen has no code yet (B-TUREN); its numeric id is just as stable.
      const parsed = await parseToStaging(buffer, context(batch.publicId, kitchen.code ?? String(kitchen.id)), staging);
      if (!parsed.ok) {
        return finish({ storageKey, status: UploadStatus.FAILED, errorCode: parsed.errorCode, errorSummary: parsed.errorSummary });
      }

      sheets = parsed.batch.sheets;
      const rowCount = parsed.batch.rows.length;
      const { detection } = parsed;
      if (!detection.ok) columnDiff = detection.diff;
      else mapping = parsed.mapping;
      // Read back by the Validasi Data page (B-MAPOUT).
      const mappingResult = { sheets, columnDiff, mapping } as Prisma.InputJsonObject;
      if (!detection.ok) {
        return finish({
          storageKey,
          rowCount,
          mappingResult,
          status: UploadStatus.NEEDS_MAPPING_UPDATE,
          errorCode: detection.errorCode,
          errorSummary: notRecognised(detection.diff),
        });
      }
      return finish({
        storageKey,
        rowCount,
        mappingResult,
        status: UploadStatus.NEEDS_REVIEW,
        mappingProfileId: detection.profile.id,
        templateVersion: detection.profile.version,
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
        ...(replaced && { replaces: replaced.publicId }),
      },
    });
    if (row.mappingProfileId) {
      await writeAuditLog(db, {
        userId: req.user!.id,
        action: 'upload_batch.profile_detected',
        entity: 'upload_batches',
        entityId: row.id,
        metadata: { mappingProfileId: row.mappingProfileId, templateVersion: row.templateVersion },
      });
    }
    // A re-upload that did not even parse leaves the old batch where it was.
    if (replaced && row.status !== UploadStatus.FAILED) {
      await db.uploadBatch.update({
        where: { id: replaced.id },
        data: { status: UploadStatus.SUPERSEDED, errorCode: 'REPLACED', errorSummary: `Diganti oleh batch ${row.publicId}.` },
      });
      await writeAuditLog(db, {
        userId: req.user!.id,
        action: 'upload_batch.replaced',
        entity: 'upload_batches',
        entityId: replaced.id,
        metadata: { from: replaced.status, to: UploadStatus.FAILED, replacedBy: row.publicId },
      });
    }
    trackEvent(row.status === UploadStatus.FAILED ? 'upload_failed' : 'upload_completed', {
      ...done,
      rows: row.rowCount,
      duration: row.durationMs,
      status: row.status,
      error_code: row.errorCode,
    });

    // Same content as `mappingResult`, flat, for the upload page.
    sendJson(
      res,
      {
        ...row,
        sheets,
        columnDiff,
        mapping,
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
