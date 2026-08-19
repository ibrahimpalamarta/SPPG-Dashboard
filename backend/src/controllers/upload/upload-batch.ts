import type { RequestHandler } from 'express';
import type { z } from 'zod';
import { Prisma, UploadStatus } from '@prisma/client';
import { prisma, type Db } from '../../db.js';
import { sendError } from '../../middleware/error-handler.js';
import { sendJson, serialize } from '../../lib/serialize.js';
import { pageArgs, paginated } from '../../lib/pagination.js';
import { kitchenScope, kitchenWhere } from '../../lib/scope.js';
import { dateFilter } from '../../schemas/common.js';
import { writeAuditLog } from '../../auth/audit.js';
import type {
  uploadBatchCreate,
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

/**
 * SCRUM-5 + SCRUM-6. `file_hash` is UNIQUE, so re-registering an identical
 * file collides at the database. We answer 409 *with the existing batch* so
 * the client can tell "already imported, here it is" apart from a plain
 * failure — that is exactly the SCRUM-6 wording, "treated as the same file".
 */
export const createUploadBatch = (db: Db = prisma): RequestHandler => async (req, res) => {
  const body = req.valid!.body as z.infer<typeof uploadBatchCreate>;
  const scope = kitchenScope(req.user!, body.kitchenId);
  if (!scope.ok) {
    sendError(res, 'FORBIDDEN');
    return;
  }

  try {
    const row = await db.uploadBatch.create({
      data: {
        kitchenId: body.kitchenId,
        uploaderId: req.user!.id,
        fileName: body.fileName,
        fileHash: body.fileHash.toLowerCase(),
        rowCount: body.rowCount,
        notes: body.notes ?? null,
        status: UploadStatus.PROCESSING,
      },
      include: withUploader,
    });
    await writeAuditLog(db, {
      userId: req.user!.id,
      action: 'upload_batch.created',
      entity: 'upload_batches',
      entityId: row.id,
      metadata: { fileName: row.fileName, kitchenId: String(row.kitchenId) },
    });
    sendJson(res, row, 201);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const existing = await db.uploadBatch.findUnique({
        where: { fileHash: body.fileHash.toLowerCase() },
        include: withUploader,
      });
      sendError(res, 'CONFLICT', {
        field: 'fileHash',
        batch: existing === null ? null : serialize(existing),
      });
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
