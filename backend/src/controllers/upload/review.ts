import type { Request, RequestHandler, Response } from 'express';
import type { z } from 'zod';
import { UploadStatus } from '@prisma/client';
import { prisma, type Db } from '../../db.js';
import { sendError } from '../../middleware/error-handler.js';
import { sendJson } from '../../lib/serialize.js';
import { kitchenScope } from '../../lib/scope.js';
import { writeAuditLog } from '../../auth/audit.js';
import { openBlockers } from '../../lib/validation/rules.js';
import { ELIGIBLE_REVIEW_STATUSES, supersedePublished } from '../../lib/publish.js';
import type { batchReturn } from '../../schemas/upload-batch.js';

/**
 * SCRUM-117 review flow, on the existing states:
 *   NEEDS_REVIEW  Data Operasional checks the findings
 *   READY         "Menunggu Review PM" (submit)
 *   READY → NEEDS_REVIEW with a mandatory note: "Dikembalikan" (errorCode RETURNED)
 *   READY → PUBLISHED (publish, SCRUM-95)
 */

/** The batch in the caller's dapur, or null once a 404/403 has been sent. */
async function scoped(db: Db, req: Request, res: Response) {
  const { id } = req.valid!.params as { id: bigint };
  const row = await db.uploadBatch.findUnique({ where: { id } });
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

/** "Kirim ke PM": only once every CRITICAL finding is resolved (SCRUM-51). */
export const submitUploadBatch = (db: Db = prisma): RequestHandler => async (req, res) => {
  const batch = await scoped(db, req, res);
  if (!batch) return;
  if (batch.status !== UploadStatus.NEEDS_REVIEW) {
    sendError(res, 'INVALID_TRANSITION', { from: batch.status, to: UploadStatus.READY });
    return;
  }
  const blockers = await openBlockers(db, batch.publicId);
  if (blockers > 0) {
    sendError(res, 'BATCH_BLOCKED', { openCritical: blockers });
    return;
  }
  const row = await db.uploadBatch.update({
    where: { id: batch.id },
    data: { status: UploadStatus.READY, validatedAt: new Date(), errorCode: null, errorSummary: null },
  });
  await writeAuditLog(db, { userId: req.user!.id, action: 'upload_batch.submitted', entity: 'upload_batches', entityId: batch.id, metadata: { from: batch.status, to: row.status } });
  sendJson(res, row);
};

/** PM sends a batch back with the reason; it lands in the uploader's Inbox. */
export const returnUploadBatch = (db: Db = prisma): RequestHandler => async (req, res) => {
  const { note } = req.valid!.body as z.infer<typeof batchReturn>;
  const batch = await scoped(db, req, res);
  if (!batch) return;
  if (batch.status !== UploadStatus.READY) {
    sendError(res, 'INVALID_TRANSITION', { from: batch.status, to: UploadStatus.NEEDS_REVIEW });
    return;
  }
  const row = await db.uploadBatch.update({
    where: { id: batch.id },
    data: { status: UploadStatus.NEEDS_REVIEW, validatedAt: null, errorCode: 'RETURNED', errorSummary: note },
  });
  await writeAuditLog(db, { userId: req.user!.id, action: 'upload_batch.returned', entity: 'upload_batches', entityId: batch.id, metadata: { note } });
  sendJson(res, row);
};

/**
 * SCRUM-95/78/96: PM MBG publishes a reviewed batch with no open blocker.
 * Idempotent: publishing a PUBLISHED batch changes nothing. Rows of earlier
 * published batches with the same business key are superseded, never deleted;
 * a correction (`replacesBatchId`) closes the batch it corrects as SUPERSEDED.
 */
export const publishUploadBatch = (db: Db = prisma): RequestHandler => async (req, res) => {
  const batch = await scoped(db, req, res);
  if (!batch) return;
  if (batch.status === UploadStatus.PUBLISHED) {
    sendJson(res, { ...batch, alreadyPublished: true });
    return;
  }
  if (batch.status !== UploadStatus.READY) {
    sendError(res, 'INVALID_TRANSITION', { from: batch.status, to: UploadStatus.PUBLISHED });
    return;
  }
  // Four-eyes (PRD AC-ROLE-02): a Data Steward holds both upload and publish, but never for the same batch.
  if (batch.uploaderId === req.user!.id) {
    sendError(res, 'FORBIDDEN', { message: 'Batch tidak bisa dipublish oleh pengunggahnya sendiri.' });
    return;
  }
  const blockers = await openBlockers(db, batch.publicId);
  if (blockers > 0) {
    sendError(res, 'BATCH_BLOCKED', { openCritical: blockers });
    return;
  }

  const { row, superseded, replaced } = await db.$transaction(async (tx) => {
    // Status flips first, so a concurrent second publish matches nothing and supersedes nothing twice.
    const { count } = await tx.uploadBatch.updateMany({
      where: { id: batch.id, status: UploadStatus.READY },
      data: { status: UploadStatus.PUBLISHED, publishedAt: new Date() },
    });
    if (count === 0) return { row: null, superseded: null, replaced: null };
    const superseded = await supersedePublished(tx, batch.publicId);
    const replaced = batch.replacesBatchId
      ? await tx.uploadBatch.updateMany({
          where: { publicId: batch.replacesBatchId, status: UploadStatus.PUBLISHED },
          data: { status: UploadStatus.SUPERSEDED, errorCode: 'REPLACED', errorSummary: `Dikoreksi oleh batch ${batch.publicId}.` },
        })
      : null;
    return { row: await tx.uploadBatch.findUniqueOrThrow({ where: { id: batch.id } }), superseded, replaced: replaced?.count ? batch.replacesBatchId : null };
  });
  if (!row) {
    sendJson(res, { ...(await db.uploadBatch.findUniqueOrThrow({ where: { id: batch.id } })), alreadyPublished: true });
    return;
  }

  const eligible = await db.financeTransaction.count({ where: { uploadBatchId: batch.publicId, reviewStatus: { in: ELIGIBLE_REVIEW_STATUSES } } });
  await writeAuditLog(db, {
    userId: req.user!.id,
    action: 'upload_batch.published',
    entity: 'upload_batches',
    entityId: batch.id,
    metadata: { superseded, eligibleTransactions: eligible, ...(replaced && { replaced }) },
  });
  sendJson(res, row);
};
