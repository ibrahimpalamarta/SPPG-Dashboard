// ponytail: Format File and Alur Data stay static content until an API exists for them too
// (Kamus Data/Aturan Cek Data/Daftar Kode moved to GET /reference-entries).
import type { Tone } from "@/components/ui/badge";

export const TABS = [
  { id: "kamus", label: "Kamus Data" },
  { id: "format", label: "Format File" },
  { id: "alur", label: "Alur Data" },
  { id: "aturan", label: "Aturan Cek Data" },
  { id: "kode", label: "Daftar Kode" },
] as const;

export type TabId = (typeof TABS)[number]["id"];

// [format file, dapur, jenis data, contoh nama file, status, berlaku mulai]
const READY: [string, Tone] = ["Siap dipakai", "green"];
const COMPARE: [string, Tone] = ["Dipakai (pembanding)", "violet"];
const PHASE_2A: [string, Tone] = ["Disiapkan untuk Phase 2a", "slate"];
const FIX: [string, Tone] = ["Perlu perbaikan", "red"];
const TRIAL: [string, Tone] = ["Uji coba (opsional)", "slate"];
type Format = [string, string, string, string, [string, Tone], string];
export const formatFile: Format[] = [
  ["Cashflow Upload v1", "Sukun", "Cashflow", "[SKN] CASHFLOW SUKUN.xlsx", READY, "2026-11-02"],
  ["Cashflow Upload v1", "Lawang", "Cashflow", "[LWG] CASHFLOW LAWANG.xlsx", COMPARE, "2026-11-23"],
  ["Cashflow Upload v1", "Donomulyo", "Cashflow", "[DNM] CASHFLOW DONOMULYO.xlsx", PHASE_2A, "2026-12-07"],
  ["Cashflow Upload v1", "Poncokusumo", "Cashflow", "[PCK] CASHFLOW PONCOKUSUMO.xlsx", PHASE_2A, "2026-12-07"],
  ["Cashflow Upload v1", "Kahean", "Cashflow", "[SML] CASHFLOW SIMALUNGUN.xlsx", FIX, "TBD"],
  ["Menu Upload v1", "Sukun", "Master Menu", "[SKN] MASTER DATA MENU - SUKUN.xlsx", READY, "2026-11-02"],
  ["Menu Upload v1", "Lawang", "Master Menu", "[LWG] MASTER DATA MENU - LAWANG.xlsx", COMPARE, "2026-11-23"],
  ["Menu Upload v1", "Donomulyo", "Master Menu", "[DNM] MASTER DATA MENU - DONOMULYO.xlsx", READY, "2026-12-07"],
  ["Menu Upload v1", "Poncokusumo", "Master Menu", "[PCK] MASTER DATA MENU - PONCOKUSUMO.xlsx", READY, "2026-12-07"],
  ["Menu Upload v1", "Kahean", "Master Menu", "[SML] MASTER DATA MENU - SIMALUNGUN.xlsx", FIX, "TBD"],
  ["Format RAB Sukun v1", "Sukun", "RAB", "RAB PERIODE*.xlsx", READY, "2026-11-02"],
  ["Format PO Sukun v1", "Sukun", "Purchase Order", "List PO for next week.xlsx", READY, "2026-11-02"],
  ["SKN Goods Receipt source profile v1", "Sukun", "Penerimaan Barang", "Terima Barang / GRN-Daily.xlsx", TRIAL, "2026-11-02"],
  ["Format Payment Sukun v1", "Sukun", "Pembayaran Supplier", "Cleaned Input Maker / EFI export", READY, "2026-11-02"],
];

export const alurLangkah = ["File dari dapur", "Disimpan", "Dicek & dirapikan", "Disetujui PM", "Tampil di dashboard"];

// [angka, diambil dari]
export const asalAngka: [string, string][] = [
  ["Top 5 Supplier", "Cashflow (per baris barang)"],
  ["Top 5 Menu", "Master Menu"],
  ["Informasi Gizi", "Master Menu + jumlah porsi tersalurkan"],
  ["Komposisi Pengeluaran", "Cashflow (kategori)"],
  ["Saldo Rekening", "Laporan saldo"],
  ["Transfer EFI Terakhir", "Cashflow / catatan transfer"],
  ["Penerima Manfaat", "Jumlah penerima per hari"],
  ["Kelengkapan Data", "Riwayat upload + daftar data wajib"],
];
