import type { RequestHandler } from 'express';
import type { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { ActiveStatus } from '@prisma/client';
import { prisma, type Db } from '../../db.js';
import { sendError } from '../../middleware/error-handler.js';
import { sendJson } from '../../lib/serialize.js';
import { kitchenScope, kitchenWhere } from '../../lib/scope.js';
import { canSeeCost } from '../../lib/visibility.js';
import { dateFilter } from '../../schemas/common.js';
import type { dashboardQuery } from '../../schemas/mart.js';

/**
 * SCRUM-9 / SCRUM-11: the internal dashboard's headline numbers, rolled up in
 * one request so the frontend does not fan out to five endpoints for a KPI row.
 *
 * Everything is derived from `daily_kitchens`, which is a mart with no writer
 * yet — expect zeros until the recompute job lands. `lastRefreshedAt` is
 * surfaced precisely so the UI can say how stale the figures are (SCRUM-11
 * asks for it explicitly).
 *
 * The cost block is omitted entirely for callers without clearance rather than
 * being sent as null: an absent key cannot be misread as "zero rupiah".
 */
export const getDashboardSummary = (db: Db = prisma): RequestHandler => async (req, res) => {
  const q = req.valid!.query as z.infer<typeof dashboardQuery>;
  const scope = kitchenScope(req.user!, q.kitchenId);
  if (!scope.ok) {
    sendError(res, 'FORBIDDEN');
    return;
  }

  const tanggal = dateFilter(q.dateFrom, q.dateTo);
  const where: Prisma.DailyKitchenWhereInput = {
    ...kitchenWhere(scope),
    ...(tanggal && { tanggal }),
  };

  const [meals, kitchensActive, latest] = await Promise.all([
    db.dailyKitchen.aggregate({
      where,
      _sum: { mealsPrepared: true, mealsDistributed: true, jumlahPm: true },
      _count: { _all: true },
    }),
    db.kitchen.count({
      where: { status: ActiveStatus.ACTIVE, ...(scope.kitchenId && { id: scope.kitchenId }) },
    }),
    db.dailyKitchen.findFirst({
      where,
      orderBy: { lastRefreshedAt: 'desc' },
      select: { lastRefreshedAt: true },
    }),
  ]);

  const costs = canSeeCost(req.user!.role)
    ? await db.menuCost.aggregate({
        where: {
          ...kitchenWhere(scope),
          ...(tanggal && { tanggal }),
        },
        _sum: { plannedCost: true, actualCost: true },
        _avg: { costPerPortion: true },
      })
    : null;

  sendJson(res, {
    period: { dateFrom: q.dateFrom ?? null, dateTo: q.dateTo ?? null },
    mealsPrepared: meals._sum.mealsPrepared ?? 0,
    mealsDistributed: meals._sum.mealsDistributed ?? 0,
    daysRecorded: meals._count._all,
    kitchensActive,
    lastRefreshedAt: latest?.lastRefreshedAt ?? null,
    ...(costs && {
      jumlahPm: meals._sum.jumlahPm ?? 0,
      cost: {
        planned: costs._sum.plannedCost,
        actual: costs._sum.actualCost,
        avgPerPortion: costs._avg.costPerPortion,
      },
    }),
  });
};
