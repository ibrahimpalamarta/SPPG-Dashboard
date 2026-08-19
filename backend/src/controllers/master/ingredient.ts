import type { RequestHandler } from 'express';
import type { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma, type Db } from '../../db.js';
import { sendError } from '../../middleware/error-handler.js';
import { sendJson } from '../../lib/serialize.js';
import { pageArgs, paginated } from '../../lib/pagination.js';
import { writeAuditLog } from '../../auth/audit.js';
import type {
  ingredientCreate,
  ingredientListQuery,
  ingredientUpdate,
} from '../../schemas/ingredient.js';

/**
 * Search covers `aliases` as well as `name`: the canonical list collapses ~443
 * spellings into ~370 ingredients, so the term a nutritionist types is often
 * an alias rather than the canonical name.
 */
export const listIngredients = (db: Db = prisma): RequestHandler => async (req, res) => {
  const q = req.valid!.query as z.infer<typeof ingredientListQuery>;
  const where: Prisma.IngredientWhereInput = q.search
    ? {
        OR: [
          { name: { contains: q.search, mode: 'insensitive' } },
          { aliases: { has: q.search } },
        ],
      }
    : {};

  const [rows, total] = await Promise.all([
    db.ingredient.findMany({ where, orderBy: { name: 'asc' }, ...pageArgs(q) }),
    db.ingredient.count({ where }),
  ]);

  sendJson(res, paginated(rows, total, q));
};

export const getIngredient = (db: Db = prisma): RequestHandler => async (req, res) => {
  const { id } = req.valid!.params as { id: bigint };
  const row = await db.ingredient.findUnique({ where: { id } });
  if (!row) {
    sendError(res, 'NOT_FOUND');
    return;
  }
  sendJson(res, row);
};

export const createIngredient = (db: Db = prisma): RequestHandler => async (req, res) => {
  const body = req.valid!.body as z.infer<typeof ingredientCreate>;
  try {
    const row = await db.ingredient.create({ data: body });
    await writeAuditLog(db, {
      userId: req.user!.id,
      action: 'ingredient.created',
      entity: 'ingredients',
      entityId: row.id,
      metadata: { name: row.name },
    });
    sendJson(res, row, 201);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      sendError(res, 'CONFLICT', { field: 'name' });
      return;
    }
    throw err;
  }
};

export const updateIngredient = (db: Db = prisma): RequestHandler => async (req, res) => {
  const { id } = req.valid!.params as { id: bigint };
  const body = req.valid!.body as z.infer<typeof ingredientUpdate>;
  try {
    const row = await db.ingredient.update({ where: { id }, data: body });
    await writeAuditLog(db, {
      userId: req.user!.id,
      action: 'ingredient.updated',
      entity: 'ingredients',
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
