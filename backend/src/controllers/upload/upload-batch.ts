import type { RequestHandler } from 'express';
import { createHash } from 'node:crypto';
import type { z } from 'zod';
import { Prisma, UploadStatus } from '@prisma/client';
import { prisma, type Db } from '../../db.js';
import { sendError } from '../../middleware/error-handler.js';
import { sendJson, serialize } from '../../lib/serialize.js';
import { pageArgs, paginated } from '../../lib/pagination.js';
import { kitchenScope, kitchenWhere } from '../../lib/scope.js';
import { parseMenuWorkbook } from '../../lib/menu-workbook.js';
import { XLSX_MIME, putObject, type PutObject } from '../../lib/s3.js';
import { dateFilter } from '../../schemas/common.js';
import { writeAuditLog } from '../../auth/audit.js';
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
  kitchen: { select: { id: true, name: true } },
} satisfies Prisma.UploadBatchInclude;

/** SCRUM-7: upload history. */
export const listUploadBatches = (db: Db = prisma): RequestHandler => async (req, res) => {
  const q = req.valid!.query as z.infer<typeof uploadBatchListQuery>;
  const scope = kitchenScope(req.user!, q.kitchenId);
  if (!scope.ok) {
    sendError(res, 'FORBIDDEN');
    return;
  }

  const uploadDate = dateFilter(q.dateFrom, q.dateTo);
  const where: Prisma.UploadBatchWhereInput = {
    ...kitchenWhere(scope),
    ...(q.status && { status: q.status }),
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
    sendError(res, 'FORBIDDEN');
    return;
  }
  sendJson(res, row);
};

/** Rows returned by a dry run. Enough to eyeball the mapping, not the file. */
const PREVIEW_ROWS = 50;

/**
 * ponytail: the S3 key is derived from the hash rather than stored in a column,
 * so `upload_batches` needs no new field and the same bytes can only ever
 * occupy one object. Add a `storage_key` column if the layout ever has to
 * change without re-uploading.
 */
export const uploadKey = (fileHash: string): string => `upload-batches/${fileHash}.xlsx`;

/**
 * SCRUM-5 + SCRUM-6. Takes the workbook itself (multipart, field `file`) and
 * does the whole job in one request: hash, dedup, parse, store, import.
 *
 * Three outcomes, all of them recorded:
 *
 *   - the file was seen before  → 409 with the existing batch (SCRUM-6 AC3;
 *     `file_hash` is UNIQUE, so this is enforced by the database)
 *   - the file parsed badly     → a DITOLAK batch row + 422. The rejection is
 *     history, not just an error code — SCRUM-5 AC3 wants it in the list
 *   - the file parsed cleanly   → a DITERIMA batch and its menu_plans, written
 *     as one nested create so the import is all-or-nothing (SCRUM-6 AC2)
 */
export const createUploadBatch =
  (db: Db = prisma, put: PutObject = putObject): RequestHandler =>
  async (req, res) => {
    const body = req.valid!.body as z.infer<typeof uploadBatchCreate>;
    const { dryRun } = req.valid!.query as z.infer<typeof uploadBatchCreateQuery>;
    const scope = kitchenScope(req.user!, body.kitchenId);
    if (!scope.ok) {
      sendError(res, 'FORBIDDEN');
      return;
    }

    const { buffer, originalname } = req.file!;
    const fileHash = createHash('sha256').update(buffer).digest('hex');

    const existing = await db.uploadBatch.findUnique({
      where: { fileHash },
      include: withUploader,
    });
    if (existing) {
      sendError(res, 'CONFLICT', { field: 'fileHash', batch: serialize(existing) });
      return;
    }

    const { columns, rows, errors } = await parseMenuWorkbook(buffer);

    // SCRUM-6 AC1: same parse, same validation, nothing written.
    if (dryRun) {
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

    const base = {
      kitchenId: body.kitchenId,
      uploaderId: req.user!.id,
      fileName: originalname,
      fileHash,
    };

    try {
      if (errors.length > 0) {
        const rejected = await db.uploadBatch.create({
          data: {
            ...base,
            rowCount: rows.length,
            status: UploadStatus.DITOLAK,
            notes: errors.join('; ').slice(0, 2000),
          },
          include: withUploader,
        });
        await writeAuditLog(db, {
          userId: req.user!.id,
          action: 'upload_batch.rejected',
          entity: 'upload_batches',
          entityId: rejected.id,
          metadata: { fileName: originalname, errorCount: errors.length },
        });
        sendError(res, 'UNPROCESSABLE', { errors, batch: serialize(rejected) });
        return;
      }

      // Stored before the insert on purpose: an orphaned object costs pennies
      // and is overwritten by the retry, whereas a committed batch with no file
      // behind it is a hole in the audit trail.
      await put(uploadKey(fileHash), buffer, XLSX_MIME);

      const row = await db.uploadBatch.create({
        data: {
          ...base,
          rowCount: rows.length,
          status: UploadStatus.DITERIMA,
          notes: body.notes ?? null,
          // Nested createMany runs inside the same transaction as its parent,
          // which is what makes the import atomic without a $transaction block.
          menuPlans: {
            createMany: { data: rows.map((r) => ({ ...r, kitchenId: body.kitchenId })) },
          },
        },
        include: withUploader,
      });

      await writeAuditLog(db, {
        userId: req.user!.id,
        action: 'upload_batch.imported',
        entity: 'upload_batches',
        entityId: row.id,
        metadata: {
          fileName: row.fileName,
          kitchenId: String(row.kitchenId),
          rowCount: row.rowCount,
        },
      });
      sendJson(res, row, 201);
    } catch (err) {
      // The findUnique above catches the ordinary case; this is the race
      // between two identical uploads landing at once.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        sendError(res, 'CONFLICT', { field: 'fileHash' });
        return;
      }
      throw err;
    }
  };

/** SCRUM-5: record the verification outcome (diterima / ditolak + reason). */
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
    sendError(res, 'FORBIDDEN');
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
