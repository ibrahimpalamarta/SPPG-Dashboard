import type { Request, RequestHandler, Response } from 'express';
import { UploadStatus } from '@prisma/client';
import { prisma, type Db } from '../../db.js';
import { sendError } from '../../middleware/error-handler.js';
import { sendJson } from '../../lib/serialize.js';
import { kitchenScope } from '../../lib/scope.js';
import { writeAuditLog } from '../../auth/audit.js';
import { openBlockers } from '../../lib/validation/rules.js';
import { ELIGIBLE_REVIEW_STATUSES, publishBatch } from '../../lib/publish.js';

/**
 * SCRUM-148/151: no Admin review. Data Operasional checks the findings
 * (NEEDS_REVIEW) and publishes its own batch (NEEDS_REVIEW → PUBLISHED).
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

/**
 * SCRUM-95/78/96/151: Data Operasional publishes a batch of its own dapur with no open blocker.
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
  if (batch.status !== UploadStatus.NEEDS_REVIEW) {
    sendError(res, 'INVALID_TRANSITION', { from: batch.status, to: UploadStatus.PUBLISHED });
    return;
  }
  const blockers = await openBlockers(db, batch.publicId);
  if (blockers > 0) {
    sendError(res, 'BATCH_BLOCKED', { openCritical: blockers });
    return;
  }

  const { row, superseded, replaced } = await publishBatch(db, batch);
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
