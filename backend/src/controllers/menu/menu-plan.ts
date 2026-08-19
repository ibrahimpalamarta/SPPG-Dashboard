import type { RequestHandler } from 'express';
import type { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma, type Db } from '../../db.js';
import { sendError } from '../../middleware/error-handler.js';
import { sendJson } from '../../lib/serialize.js';
import { pageArgs, paginated } from '../../lib/pagination.js';
import { kitchenScope, kitchenWhere } from '../../lib/scope.js';
import { menuPlanForRole } from '../../lib/visibility.js';
import { dateFilter } from '../../schemas/common.js';
import type { menuPlanListQuery } from '../../schemas/menu-plan.js';

const withRefs = {
  kitchen: { select: { id: true, name: true } },
  ingredient: { select: { id: true, name: true } },
} satisfies Prisma.MenuPlanInclude;

/**
 * SCRUM-2. One row per ingredient, so a single day of one kitchen is already
 * dozens of rows — the page cap in pageQuery is doing real work here.
 *
 * `hargaBahan` / `totalHarga` are dropped for callers without cost clearance
 * (SCRUM-13). The columns are still selected because the same handler serves
 * both audiences; menuPlanForRole is the single gate.
 */
export const listMenuPlans = (db: Db = prisma): RequestHandler => async (req, res) => {
  const q = req.valid!.query as z.infer<typeof menuPlanListQuery>;
  const scope = kitchenScope(req.user!, q.kitchenId);
  if (!scope.ok) {
    sendError(res, 'FORBIDDEN');
    return;
  }

  const tanggal = dateFilter(q.dateFrom, q.dateTo);
  const where: Prisma.MenuPlanWhereInput = {
    ...kitchenWhere(scope),
    ...(q.uploadBatchId !== undefined && { uploadBatchId: q.uploadBatchId }),
    ...(q.portionClass && { portionClass: q.portionClass }),
    ...(q.menuType && { menuType: q.menuType }),
    ...(tanggal && { tanggal }),
    ...(q.search && {
      OR: [
        { menuName: { contains: q.search, mode: 'insensitive' as const } },
        { bahan: { contains: q.search, mode: 'insensitive' as const } },
      ],
    }),
  };

  const [rows, total] = await Promise.all([
    db.menuPlan.findMany({
      where,
      include: withRefs,
      orderBy: [{ tanggal: 'desc' }, { id: 'asc' }],
      ...pageArgs(q),
    }),
    db.menuPlan.count({ where }),
  ]);

  const visible = rows.map((row) => menuPlanForRole(row, req.user!.role));
  sendJson(res, paginated(visible, total, q));
};

export const getMenuPlan = (db: Db = prisma): RequestHandler => async (req, res) => {
  const { id } = req.valid!.params as { id: bigint };
  const row = await db.menuPlan.findUnique({ where: { id }, include: withRefs });
  if (!row) {
    sendError(res, 'NOT_FOUND');
    return;
  }
  const scope = kitchenScope(req.user!, row.kitchenId);
  if (!scope.ok) {
    sendError(res, 'FORBIDDEN');
    return;
  }
  sendJson(res, menuPlanForRole(row, req.user!.role));
};

/**
 * Recipe costings are internal-only in full (SCRUM-13) — the route guard
 * already restricts the roles, so nothing is stripped here. The tenant check
 * still runs: a DATA_ADMIN must not read another dapur's costing.
 */
export const listRecipeCostings = (db: Db = prisma): RequestHandler => async (req, res) => {
  const { id } = req.valid!.params as { id: bigint };
  const menuPlan = await db.menuPlan.findUnique({
    where: { id },
    select: { id: true, kitchenId: true },
  });
  if (!menuPlan) {
    sendError(res, 'NOT_FOUND');
    return;
  }
  const scope = kitchenScope(req.user!, menuPlan.kitchenId);
  if (!scope.ok) {
    sendError(res, 'FORBIDDEN');
    return;
  }

  const rows = await db.recipeCosting.findMany({
    where: { menuPlanId: id },
    orderBy: { id: 'asc' },
  });
  sendJson(res, rows);
};
