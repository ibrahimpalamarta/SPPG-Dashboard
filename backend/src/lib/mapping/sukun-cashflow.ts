import type { StagedSheet, StagingRow } from '../ingest/staging.js';
import type { MappingOutput, MappingProfile } from './profiles.js';
import { fieldReader, parseDate, parseNumber, text, type Issue, type Normalization } from './values.js';

export type CashflowLine = {
  source_record_id: string;
  line_id: string | null;
  item_name: string | null;
  counterparty: string | null;
  qty: number | null;
  unit: string | null;
  unit_price: number | null;
  line_amount: number | null;
};

export type CashflowTxn = {
  txn_id: string;
  txn_date: string | null;
  txn_type: string | null;
  direction: string | null;
  category: string | null;
  description: string | null;
  txn_total: number | null;
  /** DQ PRD §7.4: money in (petty cash) is not external spend. TODO(B-DD): final rule. */
  is_external_spend: boolean;
  review_status: string | null;
  review_note: string | null;
  confidence: string | null;
  lines: CashflowLine[];
};

const REQUIRED = ['txn_date', 'txn_type', 'direction', 'category', 'description', 'counterparty', 'review_status'] as const;

const upper = (s: string) => s.toUpperCase();
const rupiah = (n: number) => `Rp${n.toLocaleString('id-ID')}`;

/**
 * SCRUM-27/55, MAP-SKN-CF-001. The Sukun export repeats the transaction on
 * every item line; lines are grouped back by `txn_id` and the transaction
 * fields are taken from its first line. Inconsistencies are reported as
 * issues, never corrected: the reviewer decides (Needs Review).
 */
export function applySukunCashflow(sheets: StagedSheet[], rows: StagingRow[], profile: MappingProfile): MappingOutput {
  const readers = new Map(sheets.map((s) => [s.name, fieldReader(s, profile)]));
  const txns = new Map<string, CashflowTxn>();
  const totalsSeen = new Map<string, Set<number | null>>();
  const issues: Issue[] = [];
  const normalized = new Map<string, Normalization>();
  let lineCount = 0;

  for (const row of rows) {
    const f = readers.get(row.sheetName)!(row);
    const id = row.sourceRecordId;
    const txnId = text(f.txn_id);
    if (!txnId) {
      issues.push({ code: 'NO_TXN_ID', rule: 'DQ-001', sourceRecordId: id, message: `Baris ${row.sourceRowNumber} tanpa txn_id, tidak bisa dikelompokkan.` });
      continue;
    }
    /** Counts a value the adapter read differently from how the file wrote it ("Rp65.000" → 65000, "keluar" → "KELUAR"). */
    const note = <T extends string | number>(code: string, field: string, value: T | null): T | null => {
      const raw = text(f[field]);
      if (value !== null && raw !== null && raw !== String(value) && f[field]?.type !== 'date') {
        const n = normalized.get(`${code}:${field}`);
        if (n) n.count++;
        else normalized.set(`${code}:${field}`, { code, field, count: 1, example: { raw, value } });
      }
      return value;
    };
    const money = (field: string) => note('CURRENCY_PARSED', field, parseNumber(f[field], true));
    const fold = (field: string, to: (s: string) => string) => note('CASE_FOLDED', field, text(f[field]) && to(text(f[field])!));

    lineCount++;
    const line: CashflowLine = {
      source_record_id: id,
      line_id: text(f.line_id),
      item_name: text(f.item_name),
      counterparty: text(f.counterparty),
      qty: note('NUMBER_PARSED', 'qty', parseNumber(f.qty)),
      unit: fold('unit', (s) => s.toLowerCase()),
      unit_price: money('unit_price'),
      line_amount: money('line_amount'),
    };
    if (line.qty === null || line.unit_price === null || line.line_amount === null) {
      issues.push({ code: 'MISSING_AMOUNT', rule: 'DQ-019', sourceRecordId: id, message: `${txnId} baris ${row.sourceRowNumber}: qty, harga satuan atau jumlah baris kosong/tidak terbaca.` });
    }

    // DQ-005: same half-rupiah rounding tolerance as the total check below.
    if (line.qty !== null && line.unit_price !== null && line.line_amount !== null && Math.abs(line.qty * line.unit_price - line.line_amount) > 0.5) {
      issues.push({ code: 'LINE_AMOUNT_MISMATCH', rule: 'DQ-005', sourceRecordId: id, message: `${txnId} baris ${row.sourceRowNumber}: qty × harga satuan ≠ jumlah baris.` });
    }

    const total = money('txn_total');
    let txn = txns.get(txnId);
    if (!txn) {
      // Contract "Yes" columns (13_Upload_Contract); a gap is reported, never filled in (DQ-019).
      const missing: string[] = REQUIRED.filter((k) => (k === 'txn_date' ? parseDate(f[k]) : text(f[k])) === null);
      if (total === null) missing.push('txn_total');
      if (missing.length) {
        issues.push({ code: 'MISSING_REQUIRED', rule: 'DQ-019', sourceRecordId: id, message: `${txnId} baris ${row.sourceRowNumber}: ${missing.join(', ')} kosong/tidak terbaca.` });
      }
      const direction = fold('direction', upper);
      txn = {
        txn_id: txnId,
        txn_date: note('DATE_PARSED', 'txn_date', parseDate(f.txn_date)),
        txn_type: fold('txn_type', upper),
        direction,
        category: text(f.category),
        description: text(f.description),
        txn_total: total,
        is_external_spend: direction === 'KELUAR',
        review_status: fold('review_status', upper),
        review_note: text(f.review_note),
        confidence: fold('confidence', (s) => s.toLowerCase()),
        lines: [],
      };
      txns.set(txnId, txn);
      totalsSeen.set(txnId, new Set());
    }
    totalsSeen.get(txnId)!.add(total);
    txn.lines.push(line);
  }

  const totals: Record<string, number> = {};
  for (const txn of txns.values()) {
    if (totalsSeen.get(txn.txn_id)!.size > 1) {
      issues.push({ code: 'TOTAL_INCONSISTENT', rule: 'DQ-004', message: `${txn.txn_id}: nilai total berbeda antar baris.` });
    }
    const sum = txn.lines.reduce((n, l) => n + (l.line_amount ?? 0), 0);
    // Half a rupiah covers spreadsheet rounding of qty × price.
    if (txn.txn_total !== null && Math.abs(sum - txn.txn_total) > 0.5) {
      issues.push({ code: 'LINES_NOT_TOTAL', rule: 'DQ-004', message: `${txn.txn_id}: jumlah baris ${rupiah(sum)} ≠ total ${rupiah(txn.txn_total)}.` });
    }
    // DQ-025: not eligible for KPIs until a reviewer confirms it.
    if (txn.review_status !== null && txn.review_status !== 'TERKONFIRMASI') {
      issues.push({ code: 'NEEDS_REVIEW', rule: 'DQ-025', message: `${txn.txn_id}: status_review ${txn.review_status}, ditahan sampai TERKONFIRMASI.${txn.review_note ? ` Catatan: ${txn.review_note}` : ''}` });
    }
    const key = txn.direction ?? 'TANPA_ARAH';
    totals[key] = (totals[key] ?? 0) + (txn.txn_total ?? 0);
  }

  if (lineCount > txns.size) {
    normalized.set('LINES_GROUPED', { code: 'LINES_GROUPED', field: 'txn_id', count: txns.size, example: { raw: `${lineCount} baris item`, value: `${txns.size} transaksi` } });
  }
  return { records: [...txns.values()], totals, issues, normalized: [...normalized.values()] };
}
