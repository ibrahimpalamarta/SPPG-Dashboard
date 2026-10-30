import type { StagedSheet, StagingRow } from '../ingest/staging.js';
import type { MappingOutput, MappingProfile } from './profiles.js';
import { applySukunMenu, type MenuRecipeLine } from './sukun-menu.js';

export type RabIngredientLine = {
  source_record_id: string;
  menu_type: string | null;
  menu_name: string | null;
  ingredient: string | null;
  unit_price: number | null;
  line_total: number | null;
  beneficiaries: number | null;
  ingredient_need_kg: number | null;
  packaged_need_pax: number | null;
};

export type RabDailyBudget = {
  budget_date: string;
  portion_segment: string;
  /** Σ line_total of the day's ingredient lines that have one. */
  planned_cost: number;
  /** SCRUM-53: lines without a total. Above 0 the planned cost is incomplete, never "0 for those lines". */
  missing_line_totals: number;
  /** Largest "Kebutuhan Makanan Kemasan (pax)" of the day's lines; null when none has one. */
  package_count: number | null;
  lines: RabIngredientLine[];
};

/**
 * SCRUM-44/28, MAP-SKN-RAB-001. The Sukun RAB is the menu costing sheet: one
 * row per ingredient with its price and total. Rows are read by the menu
 * adapter (same parsing, same dedup), then folded into one budget per
 * (date, portion segment). Each line keeps its `source_record_id`, so a
 * planned cost traces back to the source row.
 */
export function applySukunRab(sheets: StagedSheet[], rows: StagingRow[], profile: MappingProfile): MappingOutput {
  const menu = applySukunMenu(sheets, rows, profile);
  const days = new Map<string, RabDailyBudget>();
  const issues = [...menu.issues];

  for (const l of menu.records as MenuRecipeLine[]) {
    // Already reported by the menu adapter (INVALID_DATE / MISSING_REQUIRED).
    if (!l.serving_date || !l.portion_segment) continue;
    if (l.line_total === null) {
      issues.push({ code: 'NO_LINE_TOTAL', rule: 'DQ-019', sourceRecordId: l.source_record_id, message: `${l.serving_date} ${l.portion_segment} ${l.ingredient ?? ''}: Total Harga kosong, tidak masuk biaya rencana.` });
    }
    const key = `${l.serving_date}|${l.portion_segment}`;
    let day = days.get(key);
    if (!day) {
      day = { budget_date: l.serving_date, portion_segment: l.portion_segment, planned_cost: 0, missing_line_totals: 0, package_count: null, lines: [] };
      days.set(key, day);
    }
    if (l.line_total === null) day.missing_line_totals++;
    else day.planned_cost += l.line_total;
    if (l.packaged_need_pax !== null) day.package_count = Math.max(day.package_count ?? 0, l.packaged_need_pax);
    day.lines.push({
      source_record_id: l.source_record_id,
      menu_type: l.menu_type,
      menu_name: l.menu_name,
      ingredient: l.ingredient,
      unit_price: l.unit_price,
      line_total: l.line_total,
      beneficiaries: l.beneficiaries,
      ingredient_need_kg: l.ingredient_need_kg,
      packaged_need_pax: l.packaged_need_pax,
    });
  }

  const records = [...days.values()];
  return { records, totals: { planned_cost: records.reduce((n, d) => n + d.planned_cost, 0) }, issues };
}
