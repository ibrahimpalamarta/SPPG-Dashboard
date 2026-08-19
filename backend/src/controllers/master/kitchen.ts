import type { RequestHandler } from 'express';
import type { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma, type Db } from '../../db.js';
import { sendError } from '../../middleware/error-handler.js';
import { sendJson } from '../../lib/serialize.js';
import { pageArgs, paginated } from '../../lib/pagination.js';
import { writeAuditLog } from '../../auth/audit.js';
import type { kitchenCreate, kitchenListQuery, kitchenUpdate } from '../../schemas/kitchen.js';

type ListQuery = z.infer<typeof kitchenListQuery>;

/** SCRUM-15. Not tenant-scoped: a DATA_ADMIN still needs to name the other
 * dapur in filters, and a kitchen row carries nothing sensitive. */
export const listKitchens = (db: Db = prisma): RequestHandler => async (req, res) => {
  const q = req.valid!.query as ListQuery;
  const where: Prisma.KitchenWhereInput = {
    ...(q.status && { status: q.status }),
    ...(q.type && { type: q.type }),
    ...(q.search && { name: { contains: q.search, mode: 'insensitive' } }),
  };

  const [rows, total] = await Promise.all([
    db.kitchen.findMany({ where, orderBy: { name: 'asc' }, ...pageArgs(q) }),
    db.kitchen.count({ where }),
  ]);

  sendJson(res, paginated(rows, total, q));
};

export const getKitchen = (db: Db = prisma): RequestHandler => async (req, res) => {
  const { id } = req.valid!.params as { id: bigint };
  const row = await db.kitchen.findUnique({ where: { id } });
  if (!row) {
    sendError(res, 'NOT_FOUND');
    return;
  }
  sendJson(res, row);
};

export const createKitchen = (db: Db = prisma): RequestHandler => async (req, res) => {
  const body = req.valid!.body as z.infer<typeof kitchenCreate>;
  try {
    const row = await db.kitchen.create({ data: body });
    await writeAuditLog(db, {
      userId: req.user!.id,
      action: 'kitchen.created',
      entity: 'kitchens',
      entityId: row.id,
      metadata: { name: row.name },
    });
    sendJson(res, row, 201);
  } catch (err) {
    // `name` is UNIQUE — a duplicate is a conflict, not a server fault.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      sendError(res, 'CONFLICT', { field: 'name' });
      return;
    }
    throw err;
  }
};

export const updateKitchen = (db: Db = prisma): RequestHandler => async (req, res) => {
  const { id } = req.valid!.params as { id: bigint };
  const body = req.valid!.body as z.infer<typeof kitchenUpdate>;
  try {
    const row = await db.kitchen.update({ where: { id }, data: body });
    await writeAuditLog(db, {
      userId: req.user!.id,
      action: 'kitchen.updated',
      entity: 'kitchens',
      entityId: row.id,
      metadata: { fields: Object.keys(body) },
    });
    sendJson(res, row);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2025') {
        sendError(res, 'NOT_FOUND');
        return;
      }
      if (err.code === 'P2002') {
        sendError(res, 'CONFLICT', { field: 'name' });
        return;
      }
    }
    throw err;
  }
};
