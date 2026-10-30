import type { Tone } from "@/components/ui/badge";

export type Severity = "blocker" | "check" | "auto";

export type Finding = {
  id: string;
  severity: Severity;
  title: string;
  section: string;
  rows: string;
  description: string;
  /** One line per affected row, shown under the description. */
  details?: string[];
  /** Adapter issue code: set on findings that can be marked as checked (SCRUM-51). */
  code?: string;
  /** Set once every issue of the code is resolved, with the reviewer's note. */
  resolvedNote?: string | null;
};

export type Batch = {
  id: string;
  publicId: string;
  storageKey: string | null;
  fileName: string;
  domain: string;
  status: string;
  errorCode: string | null;
  errorSummary: string | null;
  rowCount: number;
  mappingProfileId: string | null;
  templateVersion: string | null;
  validatedAt: string | null;
  publishedAt: string | null;
  uploadDate: string;
  kitchen: { code: string | null; name: string };
  uploader: { fullName: string | null; email: string | null } | null;
};

export type MappedColumn = { sheet: string; column: string; header: string; field: string | null };

/** `upload_batches.mapping_result`, written at upload (backend `lib/ingest/pipeline.ts`). */
export type MappingResult = {
  sheets: { name: string; headerRow: number | null; rowCount: number; skipped?: string }[];
  columnDiff: { sheet: string; missing: string[]; unexpected: string[] }[];
  mapping: {
    profileId: string;
    version: string;
    records: number;
    totals: Record<string, number>;
    issues: { code: string; rule?: string; message: string; severity?: "CRITICAL" | "HIGH" | "MEDIUM" }[];
    normalized: { code: string; field: string; count: number; example: { raw: string; value: string | number } }[];
    columns: MappedColumn[];
  } | null;
};

/** Per issue code: how many are open or resolved, and the note they were resolved with (backend validation_issues). */
export type IssueStatus = { code: string; status: "OPEN" | "RESOLVED"; note: string | null; count: number };

export type BatchDetail = Batch & { mappingResult: MappingResult | null; issueStatus: IssueStatus[] };

/** Copy per adapter issue code; severity comes from the backend rule (`lib/validation/rules.ts`). */
const issueMeta: Record<string, { title: string; description: string }> = {
  NO_TXN_ID: {
    title: "Baris tanpa ID transaksi",
    description: "Baris ini tidak punya txn_id sehingga tidak bisa dikelompokkan ke transaksi. Lengkapi txn_id di file lalu unggah ulang.",
  },
  LINES_NOT_TOTAL: {
    title: "Jumlah baris tidak sama dengan total",
    description: "Penjumlahan jumlah_baris dalam satu transaksi berbeda dari kolom total. Total tidak dikoreksi otomatis.",
  },
  TOTAL_INCONSISTENT: {
    title: "Total berbeda antar baris",
    description: "Baris-baris dari satu transaksi menulis nilai total yang berbeda, sehingga total transaksi tidak pasti.",
  },
  MISSING_REQUIRED: {
    title: "Kolom wajib kosong",
    description: "Kolom wajib transaksi kosong atau tidak terbaca. Data kosong tidak diisi otomatis dan tidak dianggap 0.",
  },
  MISSING_AMOUNT: {
    title: "Qty, harga, atau jumlah kosong",
    description: "Qty, harga satuan, atau jumlah baris kosong/tidak terbaca. Pastikan nilainya memang kosong di sumber.",
  },
  LINE_AMOUNT_MISMATCH: {
    title: "Qty × harga tidak sama dengan jumlah baris",
    description: "Perkalian qty dan harga satuan berbeda lebih dari Rp0,5 dari jumlah baris.",
  },
  NEEDS_REVIEW: {
    title: "Transaksi belum terkonfirmasi",
    description: "status_review belum TERKONFIRMASI. Transaksi ditahan dari KPI sampai dikonfirmasi.",
  },
  INVALID_DATE: { title: "Tanggal kosong atau tidak terbaca", description: "Baris tanpa tanggal layanan yang valid tidak bisa dipakai." },
  MISSING_VALUE: { title: "Nilai gizi, berat, porsi, atau harga kosong", description: "Nilai kosong tetap kosong dan tidak dianggap 0." },
  NO_LINE_TOTAL: { title: "Total Harga kosong", description: "Biaya rencana hari itu ditandai tidak lengkap, bukan dihitung 0." },
  IMPLAUSIBLE_VALUE: { title: "Nilai di luar batas wajar", description: "Nilai negatif atau persentase di luar 0–100. Tidak dikoreksi otomatis." },
  DAY_MISMATCH: { title: "Nama hari tidak cocok dengan tanggal", description: "Kolom Hari berbeda dari hari tanggal layanan." },
  INGREDIENT_NEEDS_REVIEW: { title: "Satu sel berisi beberapa bahan", description: "Kolom Bahan berisi lebih dari satu bahan dan perlu dipisah." },
  URT_LOOKS_LIKE_DATE: { title: "Jumlah URT mirip tanggal Excel", description: "Kemungkinan pecahan (mis. 1/2) yang diubah Excel menjadi tanggal." },
  DUPLICATE_LINE: { title: "Baris duplikat", description: "Tanggal, porsi, menu, dan bahan yang sama muncul lagi; baris pertama yang dipakai." },
  MISSING_DATE: { title: "Tanggal kosong", description: "TANGGAL kosong atau tidak terbaca." },
  UNMAPPED_CATEGORY: {
    title: "Kategori belum ada di Daftar Kode",
    description: "Kategori mentah tidak cocok dengan daftar Kategori pengeluaran di Data Reference, jadi belum masuk Komposisi Pengeluaran.",
  },
  RECON_SUM_MISMATCH: { title: "Total tidak cocok dengan Ringkasan_Transaksi", description: "Σ total transaksi berbeda dari Σ total di sheet ringkasan." },
  RECON_COUNT_MISMATCH: { title: "Jumlah transaksi tidak cocok dengan ringkasan", description: "Banyaknya txn_id di Transaksi_Kas berbeda dari Ringkasan_Transaksi." },
  RECON_TXN_MISSING: { title: "Transaksi hanya ada di salah satu sheet", description: "txn_id ada di Transaksi_Kas atau Ringkasan_Transaksi saja." },
  RECON_TOTAL_MISMATCH: { title: "Total transaksi berbeda dari ringkasan", description: "Total satu transaksi berbeda dari baris ringkasannya." },
  RECON_STATUS_MISMATCH: { title: "Status review berbeda dari ringkasan", description: "status_review di Transaksi_Kas berbeda dari Ringkasan_Transaksi." },
  RECON_NO_SUMMARY: { title: "Tidak ada sheet Ringkasan_Transaksi", description: "Total transaksi tidak bisa dicocokkan karena file tidak membawa sheet ringkasan." },
};

const normalizedTitle: Record<string, string> = {
  CURRENCY_PARSED: "Format Rupiah dibaca sebagai angka",
  NUMBER_PARSED: "Format angka diseragamkan",
  DATE_PARSED: "Tanggal diseragamkan",
  CASE_FOLDED: "Huruf besar/kecil diseragamkan",
  LINES_GROUPED: "Baris item dikelompokkan per transaksi",
  UNIT_NORMALIZED: "Satuan diseragamkan",
};

export const severityMeta: Record<Severity, { label: string; tone: Tone; statusLabel: string }> = {
  blocker: { label: "Wajib diperbaiki", tone: "red", statusLabel: "Belum diperbaiki" },
  check: { label: "Perlu dicek", tone: "amber", statusLabel: "Belum selesai" },
  auto: { label: "Dirapikan otomatis", tone: "green", statusLabel: "Otomatis" },
};

export const tabs = ["Yang perlu ditangani", "Kolom file", "Dirapikan otomatis", "Hasil data", "Riwayat"];

/** Findings from the batch and its stored mapping result: one per issue code and one per clean-up. */
export function batchFindings(b: BatchDetail): Finding[] {
  const rows = `${b.rowCount} baris`;
  const out: Finding[] = [];
  if (b.status === "NEEDS_MAPPING_UPDATE") {
    out.push({
      id: "format",
      severity: "blocker",
      title: "Format file belum dikenali",
      section: "Kolom file",
      rows,
      description: b.errorSummary ?? "Format file tidak cocok dengan profil mapping yang ada.",
    });
  }
  if (b.mappingProfileId) {
    out.push({
      id: "profile",
      severity: "auto",
      title: "Profil mapping terdeteksi",
      section: "Mapping profile",
      rows,
      description: `Profil ${b.mappingProfileId} versi ${b.templateVersion ?? "—"} diterapkan otomatis pada file ini.`,
    });
  }

  const mapping = b.mappingResult?.mapping;
  if (!mapping) return out;
  const byCode = Map.groupBy(mapping.issues, (i) => i.code);
  for (const [code, issues] of byCode) {
    const meta = issueMeta[code] ?? { title: code, description: "Temuan dari profil mapping." };
    const rule = issues[0]?.rule;
    const status = b.issueStatus.filter((s) => s.code === code);
    const resolved = status.length > 0 && status.every((s) => s.status === "RESOLVED");
    out.push({
      id: `issue-${code}`,
      severity: issues[0]?.severity === "CRITICAL" ? "blocker" : "check",
      code,
      resolvedNote: resolved ? (status[0]?.note ?? "") : null,
      title: meta.title,
      section: rule ? `Aturan ${rule}` : "Isi data",
      rows: `${issues.length} temuan`,
      description: meta.description,
      details: issues.map((i) => i.message),
    });
  }
  const headerOf = new Map(mapping.columns.filter((c) => c.field).map((c) => [c.field, c.header]));
  for (const n of mapping.normalized) {
    const grouped = n.code === "LINES_GROUPED";
    out.push({
      id: `auto-${n.code}-${n.field}`,
      severity: "auto",
      title: normalizedTitle[n.code] ?? n.code,
      section: grouped ? "Transaksi" : `Kolom ${headerOf.get(n.field) ?? n.field}`,
      rows: grouped ? `${n.count} transaksi` : `${n.count} nilai`,
      description: grouped
        ? `${n.example.raw} digabung menjadi ${n.example.value} berdasarkan txn_id; total transaksi dihitung sekali.`
        : `Contoh: “${n.example.raw}” dibaca sebagai ${n.example.value}. Nilai asli tetap tersimpan di data mentah.`,
    });
  }
  return out;
}
