import type { RequestHandler } from 'express';
import type { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma, type Db } from '../../db.js';
import { sendError } from '../../middleware/error-handler.js';
import { sendJson } from '../../lib/serialize.js';
import { pageArgs, paginated } from '../../lib/pagination.js';
import { kitchenScope, kitchenWhere } from '../../lib/scope.js';
import { writeAuditLog } from '../../auth/audit.js';
import type { validationIssueListQuery, validationIssueResolve } from '../../schemas/validation-issue.js';

/** SCRUM-68: rejected/review records across batches, newest batch first, each traceable to its source row. */
export const listValidationIssues = (db: Db = prisma): RequestHandler => async (req, res) => {
  const q = req.valid!.query as z.infer<typeof validationIssueListQuery>;
  const scope = kitchenScope(req.user!, q.kitchenId);
  if (!scope.ok) {
    sendError(res, 'FORBIDDEN_KITCHEN');
    return;
  }
  const where: Prisma.ValidationIssueWhereInput = {
    ...kitchenWhere(scope),
    ...(q.uploadBatchId && { uploadBatchId: q.uploadBatchId }),
    ...(q.code && { code: q.code }),
    ...(q.severity && { severity: q.severity }),
    ...(q.status && { status: q.status }),
  };
  const [rows, total] = await Promise.all([
    db.validationIssue.findMany({
      where,
      include: { uploadBatch: { select: { id: true, fileName: true, domain: true, status: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      ...pageArgs(q),
    }),
    db.validationIssue.count({ where }),
  ]);
  sendJson(res, paginated(rows, total, q));
};

/** "Tandai sudah dicek": closes one issue code of a batch with a mandatory note. Re-uploading the fixed file is the other way out. */
export const resolveValidationIssues = (db: Db = prisma): RequestHandler => async (req, res) => {
  const body = req.valid!.body as z.infer<typeof validationIssueResolve>;
  const batch = await db.uploadBatch.findUnique({ where: { publicId: body.uploadBatchId }, select: { id: true, kitchenId: true, status: true } });
  if (!batch) {
    sendError(res, 'NOT_FOUND');
    return;
  }
  if (!kitchenScope(req.user!, batch.kitchenId).ok) {
    sendError(res, 'FORBIDDEN_KITCHEN');
    return;
  }
  if (batch.status !== 'NEEDS_REVIEW') {
    sendError(res, 'INVALID_TRANSITION', { message: 'Temuan hanya bisa ditandai saat batch masih dicek Data Operasional.' });
    return;
  }

  const { count } = await db.validationIssue.updateMany({
    where: { uploadBatchId: body.uploadBatchId, code: body.code, status: 'OPEN' },
    data: { status: 'RESOLVED', note: body.note, resolvedById: req.user!.id, resolvedAt: new Date() },
  });
  await writeAuditLog(db, {
    userId: req.user!.id,
    action: 'validation_issue.resolved',
    entity: 'upload_batches',
    entityId: batch.id,
    metadata: { code: body.code, count, note: body.note },
  });
  sendJson(res, { resolved: count });
};
