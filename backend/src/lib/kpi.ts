import { ELIGIBLE_REVIEW_STATUSES } from './publish.js';

/**
 * Phase 1 KPI semantics (SCRUM-62..76, 97..103, 115, 116, 129), as pure
 * functions over rows the controller has already narrowed to live data:
 * batch PUBLISHED, row not superseded, kitchen scope. Missing stays missing:
 * a NULL amount is counted as missing, never added as 0.
 */

const day = (d: Date) => d.toISOString().slice(0, 10);

// ponytail: Map.groupBy once the backend's TS lib reaches es2024.
function groupBy<T>(items: Iterable<T>, by: (t: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const t of items) (out.get(by(t)) ?? out.set(by(t), []).get(by(t))!).push(t);
  return out;
}
const key = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();

export type FinanceRow = {
  txnId: string;
  txnDate: Date | null;
  txnTotal: number | null;
  category: string | null;
  categoryNormalized: string | null;
  description: string | null;
  reviewStatus: string | null;
  isExternalSpend: boolean;
  isEfiTransfer: boolean;
  lines: { counterparty: string | null; lineAmount: number | null }[];
};

export function financeKpi(rows: FinanceRow[]) {
  const eligible = rows.filter((r) => r.reviewStatus !== null && ELIGIBLE_REVIEW_STATUSES.includes(r.reviewStatus));
  const spend = eligible.filter((r) => r.isExternalSpend);
  const counted = spend.filter((r): r is FinanceRow & { txnTotal: number } => r.txnTotal !== null);
  const total = counted.reduce((n, r) => n + r.txnTotal, 0);

  // SCRUM-62: Σ line_amount per supplier (names folded), never the repeated transaction total.
  const suppliers = new Map<string, { name: string; amount: number }>();
  for (const l of spend.flatMap((r) => r.lines)) {
    if (!l.counterparty || l.lineAmount === null) continue;
    const s = suppliers.get(key(l.counterparty)) ?? { name: l.counterparty.trim(), amount: 0 };
    s.amount += l.lineAmount;
    suppliers.set(key(l.counterparty), s);
  }
  const supplierTotal = [...suppliers.values()].reduce((n, s) => n + s.amount, 0);
  const topSuppliers = [...suppliers.values()]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
    .map((s) => ({ ...s, share: supplierTotal ? s.amount / supplierTotal : 0 }));

  // SCRUM-63: master categories; unmapped labels are kept apart and flagged, not dropped from the total.
  const categories = new Map<string, { amount: number; raw: Set<string> }>();
  const unmapped = { amount: 0, raw: new Set<string>() };
  for (const r of counted) {
    const bucket = r.categoryNormalized ? (categories.get(r.categoryNormalized) ?? { amount: 0, raw: new Set<string>() }) : unmapped;
    bucket.amount += r.txnTotal;
    if (r.category) bucket.raw.add(r.category);
    if (r.categoryNormalized) categories.set(r.categoryNormalized, bucket);
  }

  const daily = new Map<string, number>();
  for (const r of counted) if (r.txnDate) daily.set(day(r.txnDate), (daily.get(day(r.txnDate)) ?? 0) + r.txnTotal);

  // SCRUM-66: the latest EFI transfers, not part of spend.
  const efi = eligible
    .filter((r) => r.isEfiTransfer && r.txnDate)
    .sort((a, b) => b.txnDate!.getTime() - a.txnDate!.getTime())
    .slice(0, 5)
    .map((r) => ({ date: day(r.txnDate!), amount: r.txnTotal, ref: r.txnId, description: r.description }));

  return {
    spend: {
      total,
      transactions: spend.length,
      perDay: daily.size ? total / daily.size : null,
      // Not TERKONFIRMASI: kept out of every figure here (SCRUM-54), shown so nobody mistakes them for absent.
      held: rows.length - eligible.length,
      missingTotals: spend.length - counted.length,
    },
    topSuppliers,
    expenseMix: {
      categories: [...categories]
        .map(([category, b]) => ({ category, amount: b.amount, share: total ? b.amount / total : 0, raw: [...b.raw] }))
        .sort((a, b) => b.amount - a.amount),
      unmapped: { amount: unmapped.amount, raw: [...unmapped.raw] },
    },
    daily: [...daily].sort(([a], [b]) => a.localeCompare(b)).map(([date, amount]) => ({ date, amount })),
    efi: { latest: efi[0] ?? null, transfers: efi },
  };
}

export type RabRow = { plannedCost: number; packageCount: number | null; missingLineTotals: number };

/** SCRUM-64: planned (RAB) cost ÷ planned packages. Labelled plan, versioned, never actual spend. */
export function plannedCostPerPortion(rows: RabRow[]) {
  const plannedCost = rows.reduce((n, r) => n + r.plannedCost, 0);
  const portions = rows.reduce((n, r) => n + (r.packageCount ?? 0), 0);
  return {
    enabled: true as const,
    label: 'Rencana/RAB',
    formulaVersion: 'v1: Σ planned_cost ÷ Σ package_count, RAB published',
    plannedCost,
    portions,
    value: portions > 0 ? plannedCost / portions : null,
    incomplete: rows.some((r) => r.missingLineTotals > 0 || r.packageCount === null),
  };
}

const NUTRIENTS = ['energyKcal', 'proteinG', 'fatG', 'carbohydrateG', 'fiberG'] as const;
type Nutrient = (typeof NUTRIENTS)[number];

export type MenuRow = {
  kitchenId: string;
  kitchenName: string;
  servingDate: Date;
  menuType: string | null;
  portionSegment: string | null;
  menuName: string | null;
  plannedPortions: number | null;
} & Record<Nutrient, number | null>;

/**
 * SCRUM-74 (OD-13 open): staple food, seasoning and garnish are not "menus".
 * ASUMSI (D-21): matched on menu type and name; ranking basis = distinct
 * serving days, recorded in the response.
 */
const NOT_A_MENU_TYPE = new Set(['makanan pokok', 'bumbu', 'garnish']);
const NOT_A_MENU_NAME = /^nasi\b|bumbu|garnish/i;

export function topMenus(rows: MenuRow[]) {
  const menus = new Map<string, { name: string; days: Set<string>; kitchens: Set<string> }>();
  for (const r of rows) {
    if (!r.menuName || NOT_A_MENU_NAME.test(r.menuName) || (r.menuType && NOT_A_MENU_TYPE.has(key(r.menuType)))) continue;
    const m = menus.get(key(r.menuName)) ?? { name: r.menuName.trim(), days: new Set<string>(), kitchens: new Set<string>() };
    m.days.add(`${r.kitchenId}|${day(r.servingDate)}`);
    m.kitchens.add(r.kitchenName);
    menus.set(key(r.menuName), m);
  }
  return [...menus.values()]
    .map((m) => ({ name: m.name, days: m.days.size, kitchens: [...m.kitchens] }))
    .sort((a, b) => b.days - a.days || a.name.localeCompare(b.name))
    .slice(0, 5);
}

/**
 * SCRUM-76/116: nutrition per portion = Σ over a day's ingredient lines, per
 * segment; averaged over the days where that nutrient is complete. A day with
 * any blank value for a nutrient does not count for it (incompleteDays).
 * Planned portions = largest "Jumlah PM" of the day and segment.
 */
export function nutritionBySegment(rows: MenuRow[]) {
  const days = new Map<string, { segment: string; lines: MenuRow[] }>();
  for (const r of rows) {
    if (!r.portionSegment) continue;
    const k = `${r.kitchenId}|${day(r.servingDate)}|${r.portionSegment}`;
    (days.get(k) ?? days.set(k, { segment: r.portionSegment, lines: [] }).get(k)!).lines.push(r);
  }
  const bySegment = groupBy(days.values(), (d) => d.segment);
  return [...bySegment].map(([segment, ds]) => {
    const perPortion = Object.fromEntries(
      NUTRIENTS.map((n) => {
        const complete = ds.filter((d) => d.lines.every((l) => l[n] !== null));
        return [n, complete.length ? complete.reduce((s, d) => s + d.lines.reduce((t, l) => t + l[n]!, 0), 0) / complete.length : null];
      }),
    ) as Record<Nutrient, number | null>;
    const planned = ds.map((d) => Math.max(...d.lines.map((l) => l.plannedPortions ?? -1)));
    return {
      segment,
      days: ds.length,
      incompleteDays: ds.filter((d) => NUTRIENTS.some((n) => d.lines.some((l) => l[n] === null))).length,
      perPortion,
      plannedPortions: planned.every((p) => p < 0) ? null : planned.filter((p) => p >= 0).reduce((n, p) => n + p, 0),
    };
  });
}

export type BeneficiaryRow = { countDate: Date; segment: string; plannedCount: number | null; actualCount: number | null };

/**
 * SCRUM-50/103/129: delivered portions per segment from the aggregate
 * dataset. NULL actual stays NULL ("Belum ada data"). A source "Total" row is
 * checked against Σ segments; a gap flags the card instead of picking one.
 */
export function deliveredPortions(rows: BeneficiaryRow[]) {
  const isTotal = (r: BeneficiaryRow) => key(r.segment) === 'total';
  const sum = (xs: (number | null)[]) => (xs.some((x) => x !== null) ? xs.reduce<number>((n, x) => n + (x ?? 0), 0) : null);
  const segments = [...groupBy(rows.filter((r) => !isTotal(r)), (r) => r.segment)].map(([segment, rs]) => ({
    segment,
    planned: sum(rs.map((r) => r.plannedCount)),
    actual: sum(rs.map((r) => r.actualCount)),
  }));
  const actual = sum(segments.map((s) => s.actual));
  const reportedTotal = sum(rows.filter(isTotal).map((r) => r.actualCount));
  // SCRUM-103: "Penerima Manfaat / hari" = actual over the days that reported one.
  const days = new Set(rows.filter((r) => !isTotal(r) && r.actualCount !== null).map((r) => day(r.countDate))).size;
  return {
    segments,
    planned: sum(segments.map((s) => s.planned)),
    actual,
    perDay: actual === null || days === 0 ? null : Math.round(actual / days),
    status: actual === null ? ('MISSING' as const) : reportedTotal !== null && reportedTotal !== actual ? ('MISMATCH' as const) : ('OK' as const),
    ...(reportedTotal !== null && { reportedTotal }),
  };
}
