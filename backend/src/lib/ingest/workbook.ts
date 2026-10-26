import ExcelJS from 'exceljs';
import { Readable } from 'node:stream';
import { extname } from 'node:path';

/**
 * SCRUM-24: every sheet of an .xlsx (or the one sheet of a .csv) read as-is — no trimming, no number
 * parsing, no date guessing. Normalisation belongs to the adapters (Tahap 3);
 * this layer only has to make sure nothing in the source is lost.
 *
 *   - formula cell  → the computed result, plus the formula text
 *   - date cell     → ISO string, plus the raw Excel serial
 *   - merged cell   → the master's value, plus the master's address
 *   - rich text / hyperlink → their plain text
 */
export type RawCell = {
  value: string | number | boolean | null;
  type: 'string' | 'number' | 'boolean' | 'date' | 'error' | 'null';
  formula?: string;
  dateSerial?: number;
  mergedFrom?: string;
};

export type RawRow = { rowNumber: number; cells: Record<string, RawCell> };

export type RawSheet = {
  name: string;
  /** 1-based position in the workbook — sheet order is part of the source. */
  index: number;
  rows: RawRow[];
};

export class WorkbookError extends Error {
  constructor(
    readonly code: 'NOT_XLSX' | 'ENCRYPTED_FILE' | 'CORRUPT_FILE',
    message: string,
  ) {
    super(message);
  }
}

const startsWith = (buf: Buffer, bytes: number[]) => bytes.every((b, i) => buf[i] === b);

// Excel's 1900 date system: serial 25569 is 1970-01-01.
const toSerial = (d: Date) => d.getTime() / 86_400_000 + 25_569;

function readValue(v: ExcelJS.CellValue | undefined): RawCell {
  if (v === null || v === undefined) return { value: null, type: 'null' };
  if (v instanceof Date) return { value: v.toISOString(), type: 'date', dateSerial: toSerial(v) };
  if (typeof v === 'number') return { value: v, type: 'number' };
  if (typeof v === 'boolean') return { value: v, type: 'boolean' };
  if (typeof v === 'string') return { value: v, type: 'string' };
  if ('formula' in v) return { ...readValue(v.result as ExcelJS.CellValue), formula: v.formula };
  if ('sharedFormula' in v) return { ...readValue(v.result as ExcelJS.CellValue), formula: v.sharedFormula };
  if ('error' in v) return { value: v.error, type: 'error' };
  if ('richText' in v) return { value: v.richText.map((t) => t.text).join(''), type: 'string' };
  if ('text' in v) return { value: String(v.text), type: 'string' };
  return { value: String(v), type: 'string' };
}

function readCell(cell: ExcelJS.Cell): RawCell {
  const raw = readValue(cell.value);
  return cell.isMerged && cell.master.address !== cell.address ? { ...raw, mergedFrom: cell.master.address } : raw;
}

/** Magic-byte check, so a renamed file is refused before it is stored or parsed. */
export function assertXlsxContainer(buffer: Buffer): void {
  // A password-protected .xlsx is not a zip at all: Office wraps it in an
  // OLE compound file, the same container as legacy .xls.
  if (startsWith(buffer, [0xd0, 0xcf, 0x11, 0xe0])) {
    throw new WorkbookError('ENCRYPTED_FILE', 'File terproteksi password atau format .xls lama. Simpan ulang sebagai .xlsx tanpa password.');
  }
  if (!startsWith(buffer, [0x50, 0x4b, 0x03, 0x04])) {
    throw new WorkbookError('NOT_XLSX', 'File bukan workbook .xlsx yang valid.');
  }
}

export const isCsv = (fileName: string) => extname(fileName).toLowerCase() === '.csv';

/** A text file has no NUL bytes; a renamed .xlsx/.xls or an image does. */
export function assertCsvText(buffer: Buffer): void {
  if (buffer.length === 0 || buffer.includes(0)) {
    throw new WorkbookError('CORRUPT_FILE', 'File CSV kosong atau bukan teks. Ekspor ulang sebagai CSV lalu upload lagi.');
  }
}

/** Checks the container the extension promises, before anything is stored. */
export const assertReadable = (buffer: Buffer, fileName: string) =>
  isCsv(fileName) ? assertCsvText(buffer) : assertXlsxContainer(buffer);

/**
 * "Copy of X.xlsx - Transaksi_Kas.csv" (a Google Sheets export) names the
 * sheet after the last " - ". Excel forbids []:*?/\ and >31 chars in a sheet
 * name; the name is cosmetic anyway, parsers go by headers.
 */
const csvSheetName = (fileName: string) =>
  fileName
    .replace(/\.csv$/i, '')
    .split(' - ')
    .pop()!
    .replace(/[[\]:*?/\\]/g, '')
    .trim()
    .slice(0, 31) || 'CSV';

async function readCsv(buffer: Buffer, fileName: string): Promise<RawSheet[]> {
  assertCsvText(buffer);
  const workbook = new ExcelJS.Workbook();
  const text = buffer.toString('utf8').replace(/^﻿/, '');
  try {
    // Identity map: every cell stays the string written in the file. The
    // default map turns "1.885" into a number and "01-02-2026" into a date,
    // which is exactly the guessing this layer must not do.
    await workbook.csv.read(Readable.from([text]), {
      sheetName: csvSheetName(fileName),
      map: (v: string) => (v === '' ? null : v),
    });
  } catch {
    throw new WorkbookError('CORRUPT_FILE', 'File CSV tidak bisa dibaca. Ekspor ulang sebagai CSV lalu upload lagi.');
  }
  return toRawSheets(workbook);
}

/** `fileName` picks the format by extension; anything but .csv is read as .xlsx. */
export async function readWorkbook(buffer: Buffer, fileName = ''): Promise<RawSheet[]> {
  if (isCsv(fileName)) return readCsv(buffer, fileName);
  assertXlsxContainer(buffer);
  const workbook = new ExcelJS.Workbook();
  try {
    // exceljs declares its own `Buffer extends ArrayBuffer`; a Node Buffer
    // loads fine at runtime.
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  } catch {
    throw new WorkbookError('CORRUPT_FILE', 'File rusak dan tidak bisa dibaca. Simpan ulang dari Excel lalu upload lagi.');
  }
  return toRawSheets(workbook);
}

function toRawSheets(workbook: ExcelJS.Workbook): RawSheet[] {
  return workbook.worksheets.map((ws, i) => {
    const rows: RawRow[] = [];
    ws.eachRow({ includeEmpty: false }, (row) => {
      const cells: Record<string, RawCell> = {};
      row.eachCell({ includeEmpty: false }, (cell) => {
        cells[cell.address.replace(/\d+$/, '')] = readCell(cell);
      });
      rows.push({ rowNumber: row.number, cells });
    });
    return { name: ws.name, index: i + 1, rows };
  });
}

const isBlank = (c: RawCell | undefined) => !c || c.value === null || String(c.value).trim() === '';

/** A row with nothing but whitespace in it carries no data. */
export const isBlankRow = (row: RawRow) => Object.values(row.cells).every(isBlank);

export type HeaderOptions = {
  /** Only the top of the sheet is searched; titles and notes sit above the header. */
  scanRows: number;
  /** Fewest text cells for a row to count as a header. */
  minColumns: number;
};

export const DEFAULT_HEADER_OPTIONS: HeaderOptions = { scanRows: 20, minColumns: 2 };

/**
 * ponytail: heuristic — the first row within `scanRows` that has at least
 * `minColumns` non-blank cells, all of them text. A sheet with a numeric
 * header label, or a title row of two words above the real header, picks the
 * wrong row; mapping profiles (SCRUM-26) can pin the header row per source.
 */
export function detectHeaderRow(sheet: RawSheet, opts: HeaderOptions = DEFAULT_HEADER_OPTIONS): RawRow | undefined {
  return sheet.rows
    .filter((r) => r.rowNumber <= opts.scanRows)
    .find((r) => {
      const filled = Object.values(r.cells).filter((c) => !isBlank(c));
      return filled.length >= opts.minColumns && filled.every((c) => c.type === 'string');
    });
}
