import type { RawCell } from '../ingest/workbook.js';
import { loose, type StagedSheet, type StagingRow } from '../ingest/staging.js';
import type { MappingProfile } from './profiles.js';

/** One thing an adapter noticed and did not fix. The raw row stays in staging. */
export type Issue = { code: string; /** Data Quality rule id (08_Data_Quality_Rules), so Jira and reviewers see which rule fired. */ rule?: string; sourceRecordId?: string; message: string };

/** One kind of clean-up an adapter applied to a field, counted over the file, with the first value it changed. */
export type Normalization = { code: string; field: string; count: number; example: { raw: string; value: string | number } };

/**
 * Canonical field → cell of one staged row, found through the profile's
 * source header (compared `loose`, so "Berat Kotor (g)" and "berat kotor g"
 * match). Column letters differ per file; the header is what the profile pins.
 */
export function fieldReader(sheet: StagedSheet, profile: MappingProfile) {
  const byHeader = new Map(Object.entries(sheet.headers).map(([col, h]) => [loose(h), col]));
  const cols = Object.entries(profile.columns).map(([field, header]) => [field, byHeader.get(loose(header))] as const);
  return (row: StagingRow): Record<string, RawCell | undefined> =>
    Object.fromEntries(cols.map(([field, col]) => [field, col ? row.cells[col] : undefined]));
}

export const text = (cell: RawCell | undefined): string | null => {
  const s = cell?.value === null || cell?.value === undefined ? '' : String(cell.value).trim();
  return s === '' ? null : s;
};

/** "kecil", "Besar ", "BUMIL & busui" → "Kecil", "Besar", "Bumil & Busui" (DQ-010). */
export const titleCase = (s: string | null) => s && s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());

/** Spellings seen for the same unit (DQ-007). Anything else is only lower-cased, never guessed. */
const UNIT_ALIASES: Record<string, string> = {
  kilogram: 'kg',
  kgs: 'kg',
  gram: 'g',
  gr: 'g',
  grm: 'g',
  liter: 'l',
  ltr: 'l',
  lt: 'l',
  mililiter: 'ml',
  pax: 'pax',
  porsi: 'pax',
  pcs: 'pcs',
  buah: 'pcs',
  bh: 'pcs',
};

/** SCRUM-52: "Kg", "KG", "Kilogram" → "kg"; "Pax"/"porsi" → "pax". */
export const normalizeUnit = (s: string | null): string | null => {
  if (s === null) return null;
  const lower = s.toLowerCase().replace(/\.$/, '');
  return UNIT_ALIASES[lower] ?? lower;
};

/**
 * Indonesian and English separators both appear in the same file
 * ("Rp1.885.000", "Rp3,500", "1,212.00", "16,45"). With both present the last
 * one is the decimal mark. With one kind: repeated → thousands; a single one
 * followed by exactly three digits → thousands for money, decimal otherwise
 * ("Rp65.000" vs "125.00", "31,25"). Empty or unreadable → null.
 *
 * ponytail: a non-money "1,500" reads as 1.5. No sample has one; add a
 * per-field hint to the profile if a source does.
 */
export function parseNumber(cell: RawCell | undefined, money = false): number | null {
  if (typeof cell?.value === 'number') return cell.value;
  const raw = (text(cell) ?? '').replace(/rp\.?|\s/gi, '');
  // Accounting negatives in parentheses, "(1.000)" → -1000 (DQ-003).
  const negative = /^\(.*\)$/.test(raw);
  const s = negative ? raw.slice(1, -1) : raw;
  if (!/^-?\d[\d.,]*$/.test(s)) return null;

  const dot = s.lastIndexOf('.');
  const comma = s.lastIndexOf(',');
  let decimal: '.' | ',' | null = null;
  if (dot >= 0 && comma >= 0) decimal = dot > comma ? '.' : ',';
  else if (dot >= 0 || comma >= 0) {
    const sep = dot >= 0 ? '.' : ',';
    const parts = s.split(sep);
    decimal = parts.length > 2 || (money && parts[1]?.length === 3) ? null : sep;
  }

  const digits = decimal === '.' ? s.replace(/,/g, '') : decimal === ',' ? s.replace(/\./g, '').replace(',', '.') : s.replace(/[.,]/g, '');
  const n = Number(digits);
  return Number.isFinite(n) ? (negative ? -n : n) : null;
}

const EXCEL_EPOCH = Date.UTC(1899, 11, 30);
/** Earlier years are typos ("03/09/0206", DQ-002/016), not data. */
const MIN_YEAR = 2000;

/** dd/mm/yyyy, dd-mm-yyyy, an Excel serial or an xlsx date cell → "YYYY-MM-DD" (DQ-002). */
export function parseDate(cell: RawCell | undefined): string | null {
  if (cell?.type === 'date') return String(cell.value).slice(0, 10);
  if (cell?.type === 'number' && typeof cell.value === 'number') {
    const iso = new Date(EXCEL_EPOCH + Math.floor(cell.value) * 864e5).toISOString().slice(0, 10);
    return Number(iso.slice(0, 4)) >= MIN_YEAR ? iso : null;
  }
  const m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(text(cell) ?? '');
  if (!m || Number(m[3]) < MIN_YEAR) return null;
  const [, d = '', mo = '', y = ''] = m;
  const iso = `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  // Round-trip, because Date rolls 31/02 over into March instead of refusing it.
  const parsed = new Date(iso);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(iso) ? iso : null;
}
