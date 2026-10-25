import type { StagedSheet, StagingRow } from '../ingest/staging.js';
import type { MappingOutput, MappingProfile } from './profiles.js';
import { fieldReader, parseDate, parseNumber, text, titleCase, type Issue } from './values.js';

const NUMBERS = [
  'gross_weight_g',
  'net_weight_g',
  'edible_portion_pct',
  'urt_qty',
  'energy_kcal',
  'protein_g',
  'fat_g',
  'carbohydrate_g',
  'fiber_g',
  'beneficiaries',
  'ingredient_need_kg',
  'packaged_need_pax',
] as const;
const MONEY = ['unit_price', 'line_total'] as const;

/** Must be filled on every line; the rest (URT, kebutuhan kg vs pax) is either/or. */
const REQUIRED = ['net_weight_g', 'energy_kcal', 'protein_g', 'fat_g', 'carbohydrate_g', 'beneficiaries', 'unit_price', 'line_total'] as const;

type Numeric = (typeof NUMBERS)[number] | (typeof MONEY)[number];

export type MenuRecipeLine = {
  source_record_id: string;
  kitchen_id: string;
  period: string | null;
  serving_date: string | null;
  day_name: string | null;
  menu_type: string | null;
  portion_segment: string | null;
  menu_name: string | null;
  ingredient: string | null;
  urt_unit: string | null;
} & Record<Numeric, number | null>;

const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

/**
 * SCRUM-31/73, MAP-SKN-MENU-001 → menu_recipe_line. Segment and menu type
 * spelling is folded ("Besar ", "kecil" → "Besar", "Kecil"); values are
 * otherwise read, not repaired. Dedup key `serving_date|segment|menu|
 * ingredient`: the first line is kept, the rest reported.
 */
export function applySukunMenu(sheets: StagedSheet[], rows: StagingRow[], profile: MappingProfile): MappingOutput {
  const readers = new Map(sheets.map((s) => [s.name, fieldReader(s, profile)]));
  const seen = new Set<string>();
  const lines: MenuRecipeLine[] = [];
  const issues: Issue[] = [];

  for (const row of rows) {
    const f = readers.get(row.sheetName)!(row);
    const id = row.sourceRecordId;
    const at = `Sheet ${row.sheetName} baris ${row.sourceRowNumber}`;
    const line = {
      source_record_id: id,
      kitchen_id: row.kitchenId,
      period: text(f.period),
      serving_date: parseDate(f.serving_date),
      day_name: titleCase(text(f.day_name)),
      menu_type: titleCase(text(f.menu_type)),
      portion_segment: titleCase(text(f.portion_segment)),
      menu_name: text(f.menu_name),
      ingredient: text(f.ingredient),
      urt_unit: text(f.urt_unit),
      ...Object.fromEntries(NUMBERS.map((k) => [k, parseNumber(f[k])])),
      ...Object.fromEntries(MONEY.map((k) => [k, parseNumber(f[k], true)])),
    } as MenuRecipeLine;

    if (!line.serving_date) {
      issues.push({ code: 'INVALID_DATE', sourceRecordId: id, message: `${at}: tanggal kosong/tidak terbaca.` });
    } else if (line.day_name && DAYS[new Date(line.serving_date).getUTCDay()] !== line.day_name) {
      issues.push({ code: 'DAY_MISMATCH', sourceRecordId: id, message: `${at}: ${line.serving_date} bukan hari ${line.day_name}.` });
    }
    const missing = REQUIRED.filter((k) => line[k] === null);
    if (missing.length) {
      issues.push({ code: 'MISSING_VALUE', sourceRecordId: id, message: `${at}: ${missing.join(', ')} kosong/tidak terbaca.` });
    }

    const key = [line.serving_date, line.portion_segment, line.menu_name, line.ingredient].map((v) => v?.toLowerCase()).join('|');
    if (seen.has(key)) {
      issues.push({ code: 'DUPLICATE_LINE', sourceRecordId: id, message: `${at}: duplikat ${line.menu_name} / ${line.ingredient}, baris pertama dipakai.` });
      continue;
    }
    seen.add(key);
    lines.push(line);
  }

  return { records: lines, totals: { line_total: lines.reduce((n, l) => n + (l.line_total ?? 0), 0) }, issues };
}
