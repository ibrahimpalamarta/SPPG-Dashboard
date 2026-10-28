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
};

export type Batch = {
  id: string;
  publicId: string;
  fileName: string;
  domain: string;
  status: string;
  errorCode: string | null;
  errorSummary: string | null;
  rowCount: number;
  mappingProfileId: string | null;
  templateVersion: string | null;
  kitchen: { code: string | null; name: string };
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
    issues: { code: string; rule?: string; message: string }[];
    normalized: { code: string; field: string; count: number; example: { raw: string; value: string | number } }[];
    columns: MappedColumn[];
  } | null;
};

export type BatchDetail = Batch & { mappingResult: MappingResult | null };

/** Severity per adapter issue code (backend `lib/mapping/sukun-cashflow.ts`); an unknown code is "check". */
const issueMeta: Record<string, { severity: Severity; title: string; description: string }> = {
  NO_TXN_ID: {
    severity: "blocker",
    title: "Baris tanpa ID transaksi",
    description: "Baris ini tidak punya txn_id sehingga tidak bisa dikelompokkan ke transaksi. Lengkapi txn_id di file lalu unggah ulang.",
  },
  LINES_NOT_TOTAL: {
    severity: "blocker",
    title: "Jumlah baris tidak sama dengan total",
    description: "Penjumlahan jumlah_baris dalam satu transaksi berbeda dari kolom total. Total tidak dikoreksi otomatis.",
  },
  TOTAL_INCONSISTENT: {
    severity: "blocker",
    title: "Total berbeda antar baris",
    description: "Baris-baris dari satu transaksi menulis nilai total yang berbeda, sehingga total transaksi tidak pasti.",
  },
  MISSING_REQUIRED: {
    severity: "blocker",
    title: "Kolom wajib kosong",
    description: "Kolom wajib transaksi kosong atau tidak terbaca. Data kosong tidak diisi otomatis dan tidak dianggap 0.",
  },
  MISSING_AMOUNT: {
    severity: "check",
    title: "Qty, harga, atau jumlah kosong",
    description: "Qty, harga satuan, atau jumlah baris kosong/tidak terbaca. Pastikan nilainya memang kosong di sumber.",
  },
  LINE_AMOUNT_MISMATCH: {
    severity: "check",
    title: "Qty × harga tidak sama dengan jumlah baris",
    description: "Perkalian qty dan harga satuan berbeda lebih dari Rp0,5 dari jumlah baris.",
  },
  NEEDS_REVIEW: {
    severity: "check",
    title: "Transaksi belum terkonfirmasi",
    description: "status_review belum TERKONFIRMASI. Transaksi ditahan dari KPI sampai dikonfirmasi.",
  },
};

const normalizedTitle: Record<string, string> = {
  CURRENCY_PARSED: "Format Rupiah dibaca sebagai angka",
  NUMBER_PARSED: "Format angka diseragamkan",
  DATE_PARSED: "Tanggal diseragamkan",
  CASE_FOLDED: "Huruf besar/kecil diseragamkan",
  LINES_GROUPED: "Baris item dikelompokkan per transaksi",
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
    const meta = issueMeta[code] ?? { severity: "check", title: code, description: "Temuan dari profil mapping." };
    const rule = issues[0]?.rule;
    out.push({
      id: `issue-${code}`,
      severity: meta.severity,
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
