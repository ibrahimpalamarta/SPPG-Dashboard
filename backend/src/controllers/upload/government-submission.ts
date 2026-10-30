import type { RequestHandler } from 'express';
import type { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma, type Db } from '../../db.js';
import { sendError } from '../../middleware/error-handler.js';
import { sendJson } from '../../lib/serialize.js';
import { pageArgs, paginated } from '../../lib/pagination.js';
import { kitchenScope, kitchenWhere } from '../../lib/scope.js';
import { writeAuditLog } from '../../auth/audit.js';
import type { governmentSubmissionCreate, governmentSubmissionListQuery } from '../../schemas/government-submission.js';

/**
 * SCRUM-59/107: records that a source record was reported to a government
 * system. The record must exist in staging (that is what ties the submission
 * to its source and kitchen); reporting it again to the same system + module
 * updates the one log row instead of adding a second fact.
 */
export const recordGovernmentSubmission = (db: Db = prisma): RequestHandler => async (req, res) => {
  const body = req.valid!.body as z.infer<typeof governmentSubmissionCreate>;
  const source = await db.stagingRow.findFirst({
    where: { sourceRecordId: body.sourceRecordId },
    select: { uploadBatch: { select: { kitchenId: true } } },
  });
  if (!source) {
    sendError(res, 'VALIDATION_ERROR', { fields: { sourceRecordId: ['no source record with that id'] } });
    return;
  }
  const { kitchenId } = source.uploadBatch;
  if (!kitchenScope(req.user!, kitchenId).ok) {
    sendError(res, 'FORBIDDEN_KITCHEN');
    return;
  }
  const fields = { status: body.status, submittedAt: body.submittedAt, externalRef: body.externalRef ?? null, note: body.note ?? null, recordedById: req.user!.id };
  const row = await db.governmentSubmissionLog.upsert({
    where: { system_module_sourceRecordId: { system: body.system, module: body.module, sourceRecordId: body.sourceRecordId } },
    create: { ...fields, kitchenId, system: body.system, module: body.module, sourceRecordId: body.sourceRecordId },
    update: fields,
  });
  await writeAuditLog(db, {
    userId: req.user!.id,
    action: 'government_submission.recorded',
    entity: 'government_submission_logs',
    entityId: row.id,
    metadata: { system: body.system, module: body.module, sourceRecordId: body.sourceRecordId, status: body.status },
  });
  sendJson(res, row, 201);
};

export const listGovernmentSubmissions = (db: Db = prisma): RequestHandler => async (req, res) => {
  const q = req.valid!.query as z.infer<typeof governmentSubmissionListQuery>;
  const scope = kitchenScope(req.user!, q.kitchenId);
  if (!scope.ok) {
    sendError(res, 'FORBIDDEN_KITCHEN');
    return;
  }
  const where: Prisma.GovernmentSubmissionLogWhereInput = {
    ...kitchenWhere(scope),
    ...(q.system && { system: q.system }),
    ...(q.sourceRecordId && { sourceRecordId: q.sourceRecordId }),
  };
  const [rows, total] = await Promise.all([
    db.governmentSubmissionLog.findMany({ where, orderBy: { submittedAt: 'desc' }, ...pageArgs(q) }),
    db.governmentSubmissionLog.count({ where }),
  ]);
  sendJson(res, paginated(rows, total, q));
};
