import { DEFAULT_HEADER_OPTIONS, detectHeaderRow, type RawSheet } from '../ingest/workbook.js';
import { loose } from '../ingest/staging.js';
import type { CashflowTxn } from './sukun-cashflow.js';
import { parseNumber, text, type Issue } from './values.js';

/**
 * SCRUM-42: maps each raw category onto the Master Reference list "Kategori
 * pengeluaran" (Data Reference › Daftar Kode, editable by the PM), compared
 * `loose` so "Insentif Fasilitas" matches "Insentif & Fasilitas". The raw label
 * is kept; an unknown one stays NULL and is flagged, never guessed.
 */
export function normalizeCategories(txns: CashflowTxn[], categories: string[]): Issue[] {
  const byKey = new Map(categories.map((c) => [loose(c), c]));
  const unmapped = new Map<string, number>();
  for (const t of txns) {
    if (t.category === null) continue;
    t.category_normalized = byKey.get(loose(t.category)) ?? null;
    if (t.category_normalized === null) unmapped.set(t.category, (unmapped.get(t.category) ?? 0) + 1);
  }
  return [...unmapped].map(([raw, n]) => ({
    code: 'UNMAPPED_CATEGORY',
    rule: 'DQ-009',
    message: `Kategori "${raw}" (${n} transaksi) tidak ada di Master Reference "Kategori pengeluaran"; tidak masuk Komposisi Pengeluaran sampai dipetakan.`,
  }));
}

/** Half a rupiah per side of spreadsheet rounding. */
const TOLERANCE = 1;

const rupiah = (n: number) => `Rp${n.toLocaleString('id-ID')}`;

/**
 * SCRUM-84/119: the template's Ringkasan_Transaksi sheet (one row per txn_id,
 * never staged) is compared with the transactions built from Transaksi_Kas:
 * txn_id set, totals and review status. The sheet is only read here; it never
 * creates finance_transaction rows.
 */
export function reconcileRingkasan(sheets: RawSheet[], txns: CashflowTxn[]): Issue[] {
  const sheet = sheets.find((s) => loose(s.name) === 'ringkasantransaksi');
  const header = sheet && detectHeaderRow(sheet, DEFAULT_HEADER_OPTIONS);
  const col = (...names: string[]) => Object.entries(header?.cells ?? {}).find(([, c]) => names.includes(loose(String(c.value ?? ''))))?.[0];
  const idCol = col('txnid');
  const totalCol = col('total', 'totaltransaksi');
  const statusCol = col('statusreview');
  if (!sheet || !header || !idCol || !totalCol) {
    return [{ code: 'RECON_NO_SUMMARY', rule: 'DQ-046', message: 'Sheet Ringkasan_Transaksi (txn_id + total) tidak ada, jadi total transaksi tidak bisa dicocokkan dengan ringkasan.' }];
  }

  const summary = new Map<string, { total: number | null; status: string | null }>();
  for (const r of sheet.rows) {
    const id = r.rowNumber > header.rowNumber ? text(r.cells[idCol]) : null;
    if (id) summary.set(id, { total: parseNumber(r.cells[totalCol], true), status: statusCol ? (text(r.cells[statusCol])?.toUpperCase() ?? null) : null });
  }

  const issues: Issue[] = [];
  const byId = new Map(txns.map((t) => [t.txn_id, t]));
  if (summary.size !== byId.size) {
    issues.push({ code: 'RECON_COUNT_MISMATCH', rule: 'DQ-046', message: `Ringkasan_Transaksi memuat ${summary.size} txn_id, Transaksi_Kas ${byId.size}.` });
  }
  for (const [id, s] of summary) {
    const t = byId.get(id);
    if (!t) {
      issues.push({ code: 'RECON_TXN_MISSING', rule: 'DQ-046', message: `${id} ada di Ringkasan_Transaksi tapi tidak ada di Transaksi_Kas.` });
    } else {
      if (s.total !== null && t.txn_total !== null && Math.abs(s.total - t.txn_total) > TOLERANCE) {
        issues.push({ code: 'RECON_TOTAL_MISMATCH', rule: 'DQ-046', message: `${id}: total ringkasan ${rupiah(s.total)} ≠ Transaksi_Kas ${rupiah(t.txn_total)}.` });
      }
      if (s.status && t.review_status && s.status !== t.review_status) {
        issues.push({ code: 'RECON_STATUS_MISMATCH', rule: 'DQ-046', message: `${id}: status_review ringkasan ${s.status} ≠ Transaksi_Kas ${t.review_status}.` });
      }
    }
  }
  for (const id of byId.keys()) {
    if (!summary.has(id)) issues.push({ code: 'RECON_TXN_MISSING', rule: 'DQ-046', message: `${id} ada di Transaksi_Kas tapi tidak ada di Ringkasan_Transaksi.` });
  }

  const sum = (xs: (number | null)[]) => xs.reduce<number>((n, x) => n + (x ?? 0), 0);
  const summaryTotal = sum([...summary.values()].map((s) => s.total));
  const txnTotal = sum(txns.map((t) => t.txn_total));
  if (Math.abs(summaryTotal - txnTotal) > TOLERANCE) {
    issues.push({ code: 'RECON_SUM_MISMATCH', rule: 'DQ-046', message: `Σ total Ringkasan_Transaksi ${rupiah(summaryTotal)} ≠ Σ total Transaksi_Kas ${rupiah(txnTotal)}.` });
  }
  return issues;
}
