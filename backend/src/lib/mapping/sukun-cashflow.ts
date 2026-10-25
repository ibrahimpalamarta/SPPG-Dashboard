import type { StagedSheet, StagingRow } from '../ingest/staging.js';
import type { MappingOutput, MappingProfile } from './profiles.js';
import { fieldReader, parseDate, parseNumber, text, type Issue } from './values.js';

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
  review_status: string | null;
  lines: CashflowLine[];
};

const upper = (s: string | null) => s && s.toUpperCase();
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

  for (const row of rows) {
    const f = readers.get(row.sheetName)!(row);
    const id = row.sourceRecordId;
    const txnId = text(f.txn_id);
    if (!txnId) {
      issues.push({ code: 'NO_TXN_ID', sourceRecordId: id, message: `Baris ${row.sourceRowNumber} tanpa txn_id, tidak bisa dikelompokkan.` });
      continue;
    }
    const line: CashflowLine = {
      source_record_id: id,
      line_id: text(f.line_id),
      item_name: text(f.item_name),
      counterparty: text(f.counterparty),
      qty: parseNumber(f.qty),
      unit: text(f.unit)?.toLowerCase() ?? null,
      unit_price: parseNumber(f.unit_price, true),
      line_amount: parseNumber(f.line_amount, true),
    };
    if (line.qty === null || line.unit_price === null || line.line_amount === null) {
      issues.push({ code: 'MISSING_AMOUNT', sourceRecordId: id, message: `${txnId} baris ${row.sourceRowNumber}: qty, harga satuan atau jumlah baris kosong/tidak terbaca.` });
    }

    const total = parseNumber(f.txn_total, true);
    let txn = txns.get(txnId);
    if (!txn) {
      txn = {
        txn_id: txnId,
        txn_date: parseDate(f.txn_date),
        txn_type: upper(text(f.txn_type)),
        direction: upper(text(f.direction)),
        category: text(f.category),
        description: text(f.description),
        txn_total: total,
        review_status: upper(text(f.review_status)),
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
      issues.push({ code: 'TOTAL_INCONSISTENT', message: `${txn.txn_id}: nilai total berbeda antar baris.` });
    }
    const sum = txn.lines.reduce((n, l) => n + (l.line_amount ?? 0), 0);
    // Half a rupiah covers spreadsheet rounding of qty × price.
    if (txn.txn_total !== null && Math.abs(sum - txn.txn_total) > 0.5) {
      issues.push({ code: 'LINES_NOT_TOTAL', message: `${txn.txn_id}: jumlah baris ${rupiah(sum)} ≠ total ${rupiah(txn.txn_total)}.` });
    }
    const key = txn.direction ?? 'TANPA_ARAH';
    totals[key] = (totals[key] ?? 0) + (txn.txn_total ?? 0);
  }

  return { records: [...txns.values()], totals, issues };
}
