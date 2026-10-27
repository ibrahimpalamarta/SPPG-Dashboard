import { createHash } from 'node:crypto';
import type { StagedSheet, StagingRow } from '../ingest/staging.js';
import type { MappingOutput, MappingProfile } from './profiles.js';
import { fieldReader, parseDate, parseNumber, text, type Issue } from './values.js';

export type InputMakerLine = {
  source_record_id: string;
  /** Stable across re-uploads: a hash of the row's content, not of its position. */
  payment_request_id: string;
  line_no: string | null;
  request_date: string | null;
  description: string | null;
  category: string | null;
  supplier: string | null;
  /** TAGIHAN: what was requested, never read as paid (OD-14). */
  request_amount: number | null;
  checklist: boolean | null;
  supplier_invoice_link: string | null;
  payment_invoice_link: string | null;
};

/** SCRUM-86/118/30/47, MAP-SKN-PAY-001: one record per Input Maker row, no workflow timestamps or paid state. */
export function applyInputMaker(sheets: StagedSheet[], rows: StagingRow[], profile: MappingProfile): MappingOutput {
  const readers = new Map(sheets.map((s) => [s.name, fieldReader(s, profile)]));
  const issues: Issue[] = [];
  let requested = 0;
  const seen = new Map<string, number>();

  const records = rows.map((row): InputMakerLine => {
    const f = readers.get(row.sheetName)!(row);
    const key = [row.sheetName, text(f.line_no), parseDate(f.request_date), text(f.supplier), text(f.description), parseNumber(f.request_amount, true)].join('|');
    // Identical rows in one sheet are separate requests: the n-th repeat gets a suffix.
    const n = (seen.get(key) ?? 0) + 1;
    seen.set(key, n);
    const rec: InputMakerLine = {
      source_record_id: row.sourceRecordId,
      payment_request_id: `PAY-${profile.kitchenCode}-${createHash('sha1').update(key).digest('hex').slice(0, 12)}${n > 1 ? `-${n}` : ''}`,
      line_no: text(f.line_no),
      request_date: parseDate(f.request_date),
      description: text(f.description),
      category: text(f.category),
      supplier: text(f.supplier),
      request_amount: parseNumber(f.request_amount, true),
      checklist: ((v) => (v === null ? null : v.toUpperCase() === 'TRUE'))(text(f.checklist)),
      supplier_invoice_link: text(f.supplier_invoice_link),
      payment_invoice_link: text(f.payment_invoice_link),
    };
    if (rec.request_amount === null) {
      issues.push({ code: 'MISSING_AMOUNT', sourceRecordId: row.sourceRecordId, message: `Baris ${row.sourceRowNumber}: TAGIHAN kosong/tidak terbaca.` });
    } else requested += rec.request_amount;
    if (rec.request_date === null) {
      issues.push({ code: 'MISSING_DATE', sourceRecordId: row.sourceRecordId, message: `Baris ${row.sourceRowNumber}: TANGGAL kosong/tidak terbaca.` });
    }
    return rec;
  });

  return { records, totals: { TAGIHAN: requested }, issues };
}
