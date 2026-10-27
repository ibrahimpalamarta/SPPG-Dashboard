import type { SourceSystem, UploadDomain } from '@prisma/client';
import type { StagedSheet, StagingRow } from '../ingest/staging.js';
import type { Issue } from './values.js';
import { applySukunCashflow } from './sukun-cashflow.js';
import { applySukunMenu } from './sukun-menu.js';
import { applySukunRab } from './sukun-rab.js';
import { applyInputMaker } from './input-maker.js';

export type MappingOutput = { records: unknown[]; totals: Record<string, number>; issues: Issue[] };

/**
 * SCRUM-26. One source layout of one kitchen. Detection (SCRUM-39) picks a
 * profile by kitchen + domain + source system and by the sheet carrying every
 * header in `columns`; nothing anywhere branches on the kitchen's name.
 */
export type MappingProfile = {
  id: string;
  version: string;
  /** DRAFT until the data dictionary signs off the canonical names (B-DD). */
  status: 'DRAFT' | 'ACTIVE';
  kitchenCode: string;
  domain: UploadDomain;
  sourceSystem: SourceSystem;
  /** Canonical field → source header as written in the template. */
  columns: Record<string, string>;
  apply: (sheets: StagedSheet[], rows: StagingRow[], profile: MappingProfile) => MappingOutput;
};

/** CASHFLOW_SUKUN and CASHFLOW LAWANG (sheet Transaksi Kas) share one header row. */
const CASHFLOW_COLUMNS: Record<string, string> = {
  line_id: 'id',
  txn_id: 'txn_id',
  txn_date: 'tanggal',
  txn_type: 'tipe',
  direction: 'arah',
  category: 'kategori',
  description: 'uraian',
  item_name: 'nama_barang',
  counterparty: 'nama_penerima',
  qty: 'qty',
  unit: 'satuan',
  unit_price: 'harga_satuan',
  line_amount: 'jumlah_baris',
  txn_total: 'total',
  confidence: 'confidence',
  review_status: 'status_review',
  review_note: 'catatan_review',
};

/** MASTER DATA MENU - SUKUN, one sheet per month; the first header is the kitchen name. The RAB reads the same costing columns. */
const MENU_COLUMNS: Record<string, string> = {
  kitchen_name: 'Sukun',
  period: 'Periode',
  serving_date: 'Tanggal',
  day_name: 'Hari',
  menu_type: 'Menu Type',
  portion_segment: 'Porsi',
  menu_name: 'Menu',
  ingredient: 'Bahan',
  gross_weight_g: 'Berat Kotor (g)',
  net_weight_g: 'Berat Bersih (g)',
  edible_portion_pct: 'BDD (%)',
  urt_qty: 'Jumlah URT',
  urt_unit: 'URT',
  energy_kcal: 'Energi (kkal)',
  protein_g: 'Protein (g)',
  fat_g: 'Lemak (g)',
  carbohydrate_g: 'Karbohidrat (g)',
  fiber_g: 'Serat (g)',
  beneficiaries: 'Jumlah PM',
  ingredient_need_kg: 'Kebutuhan Bahan (kg)',
  packaged_need_pax: 'Kebutuhan Makanan Kemasan (pax)',
  unit_price: 'Harga Bahan (Rp)',
  line_total: 'Total Harga (Rp)',
};

/**
 * The registry (B-REG default: config in the repo, reviewed like code).
 * TODO(B-DD): canonical field names are [USULAN] until the data dictionary is
 * approved.
 */
export const PROFILES: MappingProfile[] = [
  {
    id: 'MAP-SKN-CF-001',
    version: '1',
    status: 'DRAFT',
    kitchenCode: 'SKN',
    domain: 'CASHFLOW',
    sourceSystem: 'INTERNAL',
    // CASHFLOW_SUKUN, sheet Transaksi_Kas: one row per item line.
    columns: CASHFLOW_COLUMNS,
    apply: applySukunCashflow,
  },
  {
    id: 'MAP-LWG-CF-001',
    version: '1',
    status: 'DRAFT',
    kitchenCode: 'LWG',
    domain: 'CASHFLOW',
    sourceSystem: 'INTERNAL',
    columns: CASHFLOW_COLUMNS,
    apply: applySukunCashflow,
  },
  {
    id: 'MAP-SKN-MENU-001',
    version: '1',
    status: 'DRAFT',
    kitchenCode: 'SKN',
    domain: 'MENU',
    sourceSystem: 'INTERNAL',
    columns: MENU_COLUMNS,
    apply: applySukunMenu,
  },
  {
    id: 'MAP-SKN-RAB-001',
    version: '1',
    status: 'DRAFT',
    kitchenCode: 'SKN',
    domain: 'RAB',
    sourceSystem: 'INTERNAL',
    columns: MENU_COLUMNS,
    apply: applySukunRab,
  },
  {
    id: 'MAP-SKN-PAY-001',
    version: '1',
    status: 'DRAFT',
    kitchenCode: 'SKN',
    domain: 'INPUT_MAKER',
    sourceSystem: 'INTERNAL',
    // Input Maker Upload v1 (13_Upload_Contract). Bank columns are in the contract but restricted: not staged, not mapped.
    columns: {
      line_no: 'NO',
      request_date: 'TANGGAL',
      description: 'KETERANGAN',
      category: 'Kategori',
      supplier: 'Nama Supplier',
      request_amount: 'TAGIHAN',
      checklist: 'Checklist',
      supplier_invoice_link: 'Link Invoice Pemasok',
      payment_invoice_link: 'Link Invoice Pembayaran',
    },
    apply: applyInputMaker,
  },
];
