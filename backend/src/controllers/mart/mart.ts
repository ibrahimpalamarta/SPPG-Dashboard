import type { RequestHandler } from 'express';
import type { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma, type Db } from '../../db.js';
import { sendError } from '../../middleware/error-handler.js';
import { sendJson } from '../../lib/serialize.js';
import { pageArgs, paginated } from '../../lib/pagination.js';
import { kitchenScope, kitchenWhere, menuPlanWhere } from '../../lib/scope.js';
import { dailyKitchenForRole } from '../../lib/visibility.js';
import { dateFilter } from '../../schemas/common.js';
import type {
  akgComplianceQuery,
  dailyKitchenQuery,
  menuCostQuery,
  menuNutritionQuery,
  summaryQuery,
} from '../../schemas/mart.js';

// ---------------------------------------------------------------------------
// These five tables are derived, not entered. The job that recomputes them is
// not built yet (the refresh mechanism is still undecided), so every endpoint
// below is read-only and will return an empty page until it exists. That is
// expected, not a bug — the shapes are here so the frontend can wire against
// them now.
// ---------------------------------------------------------------------------

const kitchenRef = { kitchen: { select: { id: true, name: true } } };

/** SCRUM-12: nutrition per kitchen per date per portion class. */
export const listMenuNutritions = (db: Db = prisma): RequestHandler => async (req, res) => {
  const q = req.valid!.query as z.infer<typeof menuNutritionQuery>;
  const scope = kitchenScope(req.user!, q.kitchenId);
  if (!scope.ok) {
    sendError(res, 'FORBIDDEN');
    return;
  }

  const tanggal = dateFilter(q.dateFrom, q.dateTo);
  const where: Prisma.MenuNutritionWhereInput = {
    ...kitchenWhere(scope),
    ...(q.portionClass && { portionClass: q.portionClass }),
    ...(tanggal && { tanggal }),
  };

  const [rows, total] = await Promise.all([
    db.menuNutrition.findMany({
      where,
      include: kitchenRef,
      orderBy: [{ tanggal: 'desc' }, { portionClass: 'asc' }],
      ...pageArgs(q),
    }),
    db.menuNutrition.count({ where }),
  ]);

  sendJson(res, paginated(rows, total, q));
};

/**
 * SCRUM-11: daily operational recap. `jumlahPm` is the exact beneficiary count
 * and is internal-only (SCRUM-13), so it is stripped per role rather than the
 * whole endpoint being closed — the meals figures are not sensitive.
 */
export const listDailyKitchens = (db: Db = prisma): RequestHandler => async (req, res) => {
  const q = req.valid!.query as z.infer<typeof dailyKitchenQuery>;
  const scope = kitchenScope(req.user!, q.kitchenId);
  if (!scope.ok) {
    sendError(res, 'FORBIDDEN');
    return;
  }

  const tanggal = dateFilter(q.dateFrom, q.dateTo);
  const where: Prisma.DailyKitchenWhereInput = {
    ...kitchenWhere(scope),
    ...(q.operationalStatus && { operationalStatus: q.operationalStatus }),
    ...(tanggal && { tanggal }),
  };

  const [rows, total] = await Promise.all([
    db.dailyKitchen.findMany({
      where,
      include: kitchenRef,
      orderBy: { tanggal: 'desc' },
      ...pageArgs(q),
    }),
    db.dailyKitchen.count({ where }),
  ]);

  const visible = rows.map((row) => dailyKitchenForRole(row, req.user!.role));
  sendJson(res, paginated(visible, total, q));
};

/** SCRUM-8: how each menu row sits against its AKG target. Scoped through the
 * menu plan, since the table has no kitchen column of its own. */
export const listAkgCompliances = (db: Db = prisma): RequestHandler => async (req, res) => {
  const q = req.valid!.query as z.infer<typeof akgComplianceQuery>;
  const scope = kitchenScope(req.user!, q.kitchenId);
  if (!scope.ok) {
    sendError(res, 'FORBIDDEN');
    return;
  }

  const where: Prisma.AkgComplianceWhereInput = {
    ...menuPlanWhere(scope),
    ...(q.menuPlanId !== undefined && { menuPlanId: q.menuPlanId }),
    ...(q.status && { status: q.status }),
  };

  const [rows, total] = await Promise.all([
    db.akgCompliance.findMany({
      where,
      include: {
        menuPlan: { select: { id: true, tanggal: true, menuName: true, portionClass: true } },
        akgTarget: { select: { id: true, kelompokSasaran: true, pendistribusianMbg: true } },
      },
      orderBy: { computedAt: 'desc' },
      ...pageArgs(q),
    }),
    db.akgCompliance.count({ where }),
  ]);

  sendJson(res, paginated(rows, total, q));
};

/** SCRUM-13: the whole table is sensitive. The route guard restricts roles;
 * the tenant filter still applies on top. */
export const listMenuCosts = (db: Db = prisma): RequestHandler => async (req, res) => {
  const q = req.valid!.query as z.infer<typeof menuCostQuery>;
  const scope = kitchenScope(req.user!, q.kitchenId);
  if (!scope.ok) {
    sendError(res, 'FORBIDDEN');
    return;
  }

  const tanggal = dateFilter(q.dateFrom, q.dateTo);
  const where: Prisma.MenuCostWhereInput = {
    ...kitchenWhere(scope),
    ...(q.menuPlanId !== undefined && { menuPlanId: q.menuPlanId }),
    ...(tanggal && { tanggal }),
  };

  const [rows, total] = await Promise.all([
    db.menuCost.findMany({
      where,
      include: kitchenRef,
      orderBy: { tanggal: 'desc' },
      ...pageArgs(q),
    }),
    db.menuCost.count({ where }),
  ]);

  sendJson(res, paginated(rows, total, q));
};

/** Program-wide KPI periods. Not kitchen-scoped — there is no kitchen column. */
export const listSummaries = (db: Db = prisma): RequestHandler => async (req, res) => {
  const q = req.valid!.query as z.infer<typeof summaryQuery>;
  const periodStart = dateFilter(q.dateFrom, q.dateTo);
  const where: Prisma.PublicSummaryWhereInput = { ...(periodStart && { periodStart }) };

  const [rows, total] = await Promise.all([
    db.publicSummary.findMany({ where, orderBy: { periodStart: 'desc' }, ...pageArgs(q) }),
    db.publicSummary.count({ where }),
  ]);

  sendJson(res, paginated(rows, total, q));
};
