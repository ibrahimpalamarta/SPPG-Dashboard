import type { RequestHandler } from 'express';
import type { z } from 'zod';
import { prisma, type Db } from '../../db.js';
import { env } from '../../config/env.js';
import { sendError } from '../../middleware/error-handler.js';
import { sendJson } from '../../lib/serialize.js';
import { kitchenScope, kitchenWhere } from '../../lib/scope.js';
import { canSeeCost } from '../../lib/visibility.js';
import { dateFilter } from '../../schemas/common.js';
import { deliveredPortions, financeKpi, nutritionBySegment, plannedCostPerPortion, topMenus } from '../../lib/kpi.js';
import type { dashboardQuery, menuKpiQuery } from '../../schemas/mart.js';

/** Live = published, not superseded by a later publish, inside the caller's dapur (SCRUM-54/78). */
const live = (kitchens: ReturnType<typeof kitchenWhere>) => ({ ...kitchens, supersededByBatchId: null, uploadBatch: { status: 'PUBLISHED' as const } });

const num = (d: { toNumber(): number } | null) => (d === null ? null : d.toNumber());

const DAY_MS = 864e5;
/** SCRUM-74/115: Top 5 Menu covers a two-week serving window. */
const MENU_WINDOW_DAYS = 14;

/**
 * SCRUM-62..66, 97..102: everything the Overview and Finance & Cost pages
 * show about money, in one request. Cost roles only (route guard).
 */
export const getFinanceKpi = (db: Db = prisma): RequestHandler => async (req, res) => {
  const q = req.valid!.query as z.infer<typeof dashboardQuery>;
  const scope = kitchenScope(req.user!, q.kitchenId);
  if (!scope.ok) {
    sendError(res, 'FORBIDDEN_KITCHEN');
    return;
  }
  const base = live(kitchenWhere(scope));
  const dates = dateFilter(q.dateFrom, q.dateTo);

  const [txns, balances, rab] = await Promise.all([
    db.financeTransaction.findMany({
      where: { ...base, ...(dates && { txnDate: dates }) },
      select: {
        txnId: true,
        txnDate: true,
        txnTotal: true,
        category: true,
        categoryNormalized: true,
        description: true,
        reviewStatus: true,
        isExternalSpend: true,
        isEfiTransfer: true,
        lines: { select: { counterparty: true, lineAmount: true } },
      },
    }),
    db.financeBalance.findMany({ where: { ...base, ...(dates && { balanceDate: dates }) }, orderBy: { balanceDate: 'desc' } }),
    env.KPI_PLANNED_COST
      ? db.rabDailyBudget.findMany({ where: { ...base, ...(dates && { budgetDate: dates }) }, select: { plannedCost: true, packageCount: true, missingLineTotals: true } })
      : null,
  ]);

  const kpi = financeKpi(
    txns.map((t) => ({ ...t, txnTotal: num(t.txnTotal), lines: t.lines.map((l) => ({ counterparty: l.counterparty, lineAmount: num(l.lineAmount) })) })),
  );
  // SCRUM-65/101: OD-02 (official balance source) is open, so a balance is at best a draft.
  const latest = [...new Map(balances.map((b) => [b.accountRef, b])).values()];
  sendJson(res, {
    ...kpi,
    balance: {
      status: latest.length ? 'DRAFT' : 'UNAVAILABLE',
      asOf: latest[0]?.balanceDate.toISOString().slice(0, 10) ?? null,
      accounts: latest.map((b) => ({ accountRef: b.accountRef, balance: num(b.balance), sourceSystem: b.sourceSystem })),
    },
    plannedCostPerPortion: rab
      ? plannedCostPerPortion(rab.map((r) => ({ plannedCost: r.plannedCost.toNumber(), packageCount: num(r.packageCount), missingLineTotals: r.missingLineTotals })))
      : { enabled: false },
  });
};

/**
 * SCRUM-74/115, 76/116/129, 50/103/72: menu, nutrition and portions. The
 * window is the two weeks up to `dateTo` (default: the latest published
 * serving date). Beneficiary counts are internal (SCRUM-13): only cost roles
 * get the portions block, and it is aggregate-only by construction.
 */
export const getMenuKpi = (db: Db = prisma): RequestHandler => async (req, res) => {
  const q = req.valid!.query as z.infer<typeof menuKpiQuery>;
  const scope = kitchenScope(req.user!, q.kitchenId);
  if (!scope.ok) {
    sendError(res, 'FORBIDDEN_KITCHEN');
    return;
  }
  const base = { ...live(kitchenWhere(scope)), ...(q.region && { kitchen: { cityRegency: q.region } }) };

  const to =
    q.dateTo ??
    (await db.menuRecipeLine.findFirst({ where: { ...base, servingDate: { not: null } }, orderBy: { servingDate: 'desc' }, select: { servingDate: true } }))?.servingDate;
  if (!to) {
    sendJson(res, { window: null, basis: 'serving_days', topMenus: [], nutrition: [], ...(canSeeCost(req.user!.role) && { portions: deliveredPortions([]) }) });
    return;
  }
  const from = q.dateFrom ?? new Date(to.getTime() - (MENU_WINDOW_DAYS - 1) * DAY_MS);
  const window = { gte: from, lte: to };

  const [lines, counts] = await Promise.all([
    db.menuRecipeLine.findMany({
      where: { ...base, servingDate: window },
      select: {
        kitchenId: true,
        kitchen: { select: { name: true } },
        servingDate: true,
        menuType: true,
        portionSegment: true,
        menuName: true,
        plannedPortions: true,
        energyKcal: true,
        proteinG: true,
        fatG: true,
        carbohydrateG: true,
        fiberG: true,
      },
    }),
    canSeeCost(req.user!.role)
      ? db.beneficiaryDailyCount.findMany({ where: { ...base, countDate: window }, select: { countDate: true, segment: true, plannedCount: true, actualCount: true } })
      : null,
  ]);
  const rows = lines.map((l) => ({
    kitchenId: String(l.kitchenId),
    kitchenName: l.kitchen.name,
    servingDate: l.servingDate!,
    menuType: l.menuType,
    portionSegment: l.portionSegment,
    menuName: l.menuName,
    plannedPortions: num(l.plannedPortions),
    energyKcal: num(l.energyKcal),
    proteinG: num(l.proteinG),
    fatG: num(l.fatG),
    carbohydrateG: num(l.carbohydrateG),
    fiberG: num(l.fiberG),
  }));
  sendJson(res, {
    window: { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) },
    basis: 'serving_days',
    topMenus: topMenus(rows),
    nutrition: nutritionBySegment(rows),
    ...(counts && { portions: deliveredPortions(counts) }),
  });
};
