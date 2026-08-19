import ExcelJS from 'exceljs';
import { z } from 'zod';
import { MenuType, PortionClass } from '@prisma/client';

/**
 * SCRUM-6: turns the uploaded menu workbook into `menu_plans` rows. One sheet
 * row = one ingredient of one menu, which is already the shape of the table
 * (SCRUM-2), so there is no reshaping here — only parsing and validation.
 *
 * ponytail: the header labels below were derived from `schema.prisma` and the
 * SOP-OPR-001 form, not from a real workbook — none was available when this was
 * written. If the actual file words a column differently, change the label in
 * HEADERS and nothing else needs to move.
 */
const HEADERS = {
  tanggal: 'Tanggal',
  hari: 'Hari',
  menuType: 'Jenis Menu',
  portionClass: 'Kelompok Porsi',
  menuName: 'Menu',
  bahan: 'Bahan',
  beratBersih: 'Berat Bersih',
  beratKotor: 'Berat Kotor',
  bdd: 'BDD',
  jumlahUrt: 'Jumlah URT',
  satuanUrt: 'Satuan URT',
  energi: 'Energi',
  protein: 'Protein',
  lemak: 'Lemak',
  karbohidrat: 'Karbohidrat',
  serat: 'Serat',
  jumlahPm: 'Jumlah PM',
  kebutuhanBahanKg: 'Kebutuhan Bahan',
  kebutuhanKemasanPax: 'Kebutuhan Kemasan',
  hargaBahan: 'Harga Bahan',
  totalHarga: 'Total Harga',
} as const;

type Field = keyof typeof HEADERS;

/** Columns the importer refuses to guess at. Everything else may be blank. */
const REQUIRED: readonly Field[] = [
  'tanggal',
  'menuType',
  'portionClass',
  'menuName',
  'bahan',
  'beratBersih',
  'beratKotor',
  'bdd',
  'energi',
  'protein',
  'lemak',
  'karbohidrat',
  'jumlahPm',
];

/**
 * Header matching is deliberately forgiving about case, spacing, punctuation
 * and a trailing unit — "Berat Bersih (g)", "berat_bersih" and "BERAT BERSIH"
 * are the same column. It is not forgiving about the word itself.
 */
const norm = (v: unknown): string =>
  String(v ?? '')
    .replace(/\(.*?\)/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

const MENU_TYPES: Record<string, MenuType> = { kering: MenuType.KERING, basah: MenuType.BASAH };

const PORTION_CLASSES: Record<string, PortionClass> = {
  kecil: PortionClass.KECIL,
  besar: PortionClass.BESAR,
  balita: PortionClass.BALITA,
  busuibumil: PortionClass.BUSUI_BUMIL,
  busuidanbumil: PortionClass.BUSUI_BUMIL,
};

/** A cell can hold a formula result, rich text or a hyperlink rather than a
 * plain value. Flatten first so every column is parsed from the same shape. */
function cellValue(cell: ExcelJS.Cell): unknown {
  const v = cell.value;
  if (v && typeof v === 'object' && !(v instanceof Date)) {
    if ('result' in v) return v.result;
    if ('richText' in v) return v.richText.map((t) => t.text).join('');
    if ('text' in v) return v.text;
  }
  return v;
}

const blank = (v: unknown): boolean => v === null || v === undefined || String(v).trim() === '';

const text = z.preprocess((v) => String(v).trim(), z.string().min(1));

/** Excel gives a real Date for date-formatted cells. A bare string like
 * "03/12/2026" is ambiguous between day-first and month-first, so it is
 * rejected rather than guessed — ISO is accepted because it cannot be. */
const excelDate = z.union([
  z.date(),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}/, 'format the column as a date in Excel, or write it as YYYY-MM-DD')
    .transform((v) => new Date(v)),
]);

const decimal = z.preprocess(
  (v) => (typeof v === 'string' ? v.replace(/\s/g, '').replace(',', '.') : v),
  z.coerce.number().finite(),
);

const enumFrom = <T extends string>(map: Record<string, T>, label: string) =>
  z.preprocess(
    (v) => map[norm(v)],
    z.string({ invalid_type_error: `must be one of ${label}` }) as unknown as z.ZodType<T>,
  );

const optional = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (blank(v) ? undefined : v), schema.optional());

const rowSchema = z.object({
  tanggal: excelDate,
  hari: optional(text),
  menuType: enumFrom(MENU_TYPES, 'Kering, Basah'),
  portionClass: enumFrom(PORTION_CLASSES, 'Kecil, Besar, Balita, Busui & Bumil'),
  menuName: text,
  bahan: text,
  beratBersih: decimal,
  beratKotor: decimal,
  bdd: decimal,
  jumlahUrt: optional(decimal),
  satuanUrt: optional(text),
  energi: decimal,
  protein: decimal,
  lemak: decimal,
  karbohidrat: decimal,
  serat: optional(decimal),
  jumlahPm: z.coerce.number().int().min(0),
  kebutuhanBahanKg: optional(decimal),
  kebutuhanKemasanPax: optional(decimal),
  hargaBahan: optional(decimal),
  totalHarga: optional(decimal),
});

/** Exactly the `menu_plans` columns the workbook supplies — kitchen, batch and
 * ingredient are attached by the controller, not by the file. */
export type MenuPlanRow = z.infer<typeof rowSchema>;

export interface ParsedWorkbook {
  /** Header labels as written in the file, in sheet order (SCRUM-6 preview). */
  columns: string[];
  rows: MenuPlanRow[];
  /** Human-readable, row-numbered. Empty means the file is importable. */
  errors: string[];
}

/** Enough for a person to fix the file; past this the list stops being useful
 * and starts being a payload. */
const MAX_ERRORS = 50;

export async function parseMenuWorkbook(buffer: Buffer): Promise<ParsedWorkbook> {
  const workbook = new ExcelJS.Workbook();
  try {
    // exceljs ships `declare interface Buffer extends ArrayBuffer {}`, which is
    // not Node's Buffer. It reads a Node Buffer perfectly well at runtime — the
    // cast exists only to get past that declaration.
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  } catch {
    return { columns: [], rows: [], errors: ['file is not a readable .xlsx workbook'] };
  }

  const sheet = workbook.worksheets[0];
  if (!sheet || sheet.rowCount < 2) {
    return { columns: [], rows: [], errors: ['workbook has no data rows'] };
  }

  const headerRow = sheet.getRow(1);
  const columns: string[] = [];
  const columnOf = new Map<Field, number>();
  const byLabel = new Map(
    Object.entries(HEADERS).map(([field, label]) => [norm(label), field as Field]),
  );

  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const label = String(cellValue(cell) ?? '').trim();
    columns.push(label);
    const field = byLabel.get(norm(label));
    // First occurrence wins: a duplicated header is a spreadsheet accident, and
    // silently taking the last one is the surprising behaviour.
    if (field && !columnOf.has(field)) columnOf.set(field, colNumber);
  });

  const missing = REQUIRED.filter((f) => !columnOf.has(f)).map((f) => HEADERS[f]);
  if (missing.length > 0) {
    return { columns, rows: [], errors: [`missing required column(s): ${missing.join(', ')}`] };
  }

  const rows: MenuPlanRow[] = [];
  const errors: string[] = [];

  for (let n = 2; n <= sheet.rowCount; n += 1) {
    const row = sheet.getRow(n);
    const raw = Object.fromEntries(
      [...columnOf].map(([field, col]) => [field, cellValue(row.getCell(col))]),
    );

    // Trailing blank rows are normal in a hand-maintained sheet, not an error.
    if (Object.values(raw).every(blank)) continue;

    const result = rowSchema.safeParse(raw);
    if (result.success) {
      rows.push(result.data);
      continue;
    }
    if (errors.length < MAX_ERRORS) {
      for (const [field, messages] of Object.entries(result.error.flatten().fieldErrors)) {
        if (messages?.length) errors.push(`row ${n}: ${HEADERS[field as Field]} — ${messages[0]}`);
      }
    }
  }

  if (rows.length === 0 && errors.length === 0) errors.push('workbook has no data rows');
  return { columns, rows, errors: errors.slice(0, MAX_ERRORS) };
}
