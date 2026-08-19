import type { RequestHandler } from 'express';
import type { z } from 'zod';
import { Prisma, Role } from '@prisma/client';
import { prisma, type Db } from '../../db.js';
import { sendError } from '../../middleware/error-handler.js';
import { sendJson } from '../../lib/serialize.js';
import { pageArgs, paginated } from '../../lib/pagination.js';
import { dateFilter } from '../../schemas/common.js';
import { writeAuditLog } from '../../auth/audit.js';
import type { auditLogListQuery, userListQuery, userUpdate } from '../../schemas/user.js';

const withScope = { scope: { select: { id: true, name: true } } };

export const listUsers = (db: Db = prisma): RequestHandler => async (req, res) => {
  const q = req.valid!.query as z.infer<typeof userListQuery>;
  const where: Prisma.UserWhereInput = {
    ...(q.role && { role: q.role }),
    ...(q.status && { status: q.status }),
    ...(q.search && {
      OR: [
        { email: { contains: q.search, mode: 'insensitive' as const } },
        { fullName: { contains: q.search, mode: 'insensitive' as const } },
      ],
    }),
  };

  const [rows, total] = await Promise.all([
    db.user.findMany({
      where,
      include: withScope,
      orderBy: { createdAt: 'desc' },
      ...pageArgs(q),
    }),
    db.user.count({ where }),
  ]);

  sendJson(res, paginated(rows, total, q));
};

/**
 * Role and scope are the only editable columns — Auth0 owns email and name,
 * and findOrCreateUser overwrites them at the next login anyway.
 *
 * Two invariants are enforced here rather than in the schema, because both
 * need to see the resulting row rather than just the request body:
 *
 *   1. A Super Admin cannot demote or deactivate itself. Locking the last
 *      administrator out of the backoffice needs a database round-trip to fix.
 *   2. A DATA_ADMIN must end up with a scope. Without one, resolveScopeId
 *      returns null-scoped nothing and the account silently sees no data.
 */
export const updateUser = (db: Db = prisma): RequestHandler => async (req, res) => {
  const { id } = req.valid!.params as { id: bigint };
  const body = req.valid!.body as z.infer<typeof userUpdate>;

  const current = await db.user.findUnique({ where: { id } });
  if (!current) {
    sendError(res, 'NOT_FOUND');
    return;
  }

  if (current.id === req.user!.id && (body.role !== undefined || body.status !== undefined)) {
    sendError(res, 'FORBIDDEN', { reason: 'cannot change own role or status' });
    return;
  }

  const nextRole = body.role ?? current.role;
  const nextScope = body.scopeId !== undefined ? body.scopeId : current.scopeId;
  if (nextRole === Role.DATA_ADMIN && nextScope === null) {
    sendError(res, 'VALIDATION_ERROR', {
      fields: { 'body.scopeId': ['required when role is DATA_ADMIN'] },
    });
    return;
  }

  try {
    const row = await db.user.update({
      where: { id },
      data: {
        ...(body.role !== undefined && { role: body.role }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.scopeId !== undefined && { scopeId: body.scopeId }),
      },
      include: withScope,
    });

    await writeAuditLog(db, {
      userId: req.user!.id,
      action: 'user.updated',
      entity: 'users',
      entityId: row.id,
      metadata: {
        fields: Object.keys(body),
        ...(body.role && { roleFrom: current.role, roleTo: body.role }),
      },
    });

    sendJson(res, row);
  } catch (err) {
    // scope_id is a real FK to kitchens; a bad id is the caller's mistake.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
      sendError(res, 'VALIDATION_ERROR', {
        fields: { 'body.scopeId': ['no kitchen with that id'] },
      });
      return;
    }
    throw err;
  }
};

/** SCRUM-1: the audit trail, readable but never writable through the API. */
export const listAuditLogs = (db: Db = prisma): RequestHandler => async (req, res) => {
  const q = req.valid!.query as z.infer<typeof auditLogListQuery>;
  const timestamp = dateFilter(q.dateFrom, q.dateTo);
  const where: Prisma.AuditLogWhereInput = {
    ...(q.userId !== undefined && { userId: q.userId }),
    ...(q.entity && { entity: q.entity }),
    ...(q.action && { action: q.action }),
    ...(timestamp && { timestamp }),
  };

  const [rows, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      include: { user: { select: { id: true, email: true, fullName: true } } },
      orderBy: { timestamp: 'desc' },
      ...pageArgs(q),
    }),
    db.auditLog.count({ where }),
  ]);

  sendJson(res, paginated(rows, total, q));
};
