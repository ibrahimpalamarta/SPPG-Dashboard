import { loose, stageRows, type DomainParser } from './staging.js';

/**
 * SCRUM-35: Cashflow staging (`finance_txn_upload`, 1 row per uploaded
 * transaction or item line). Staging only — no totals, no transfer
 * classification, no category or currency normalisation (SCRUM-41/42/43/52).
 *
 * Contract source: "Template Basis Data Arus Kas — Struktur & Aturan Unggah"
 * (MBG_SPPG_Cashflow_Template_1.xlsx, SPPG Kebonsari Sukun, sheet Kamus_Data):
 *   Transaksi_Kas    — the spine, one row per cash movement, keyed by txn_id
 *   Rincian_Belanja  — item lines, linked by txn_id
 *   Insentif_Penggajian — per-person pay detail, 1:1 with a Transaksi_Kas row
 * plus Struktur / Kamus_Data / Validasi / Ref_* (documentation and lookups).
 *
 * Which sheets are data is decided by their header, not their name: any
 * sheet with a `txn_id` column. That also takes Donomulyo's single
 * "Transaksi Kas" sheet, whose columns differ (decisions.md K-05), without a
 * kitchen branch here — telling the layouts apart is the profile's job
 * (SCRUM-26/39).
 */
const PERSONAL_DATA_SHEETS = new Set(['insentifpenggajian']);

export const cashflowParser: DomainParser = (sheets, ctx) =>
  stageRows(sheets, ctx, (sheet, headers) => {
    // Names, bank accounts and account holders of individual staff. The
    // amount already sits on the Transaksi_Kas row (tipe INSENTIF/PENGGAJIAN),
    // so finance loses nothing by not copying the people (PRD §2, OS8).
    if (PERSONAL_DATA_SHEETS.has(loose(sheet.name))) return 'Data pribadi (nama/rekening) tidak disalin ke staging';
    if (!headers.some((h) => loose(h) === 'txnid')) return 'Bukan sheet data transaksi (tidak ada kolom txn_id)';
    return null;
  });
