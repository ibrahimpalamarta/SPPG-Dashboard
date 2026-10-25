// ponytail: static mockup data until the mapping/validation API exists; replace with a fetch then.
import type { Tone } from "@/components/ui/badge";

export type Severity = "blocker" | "check" | "auto";

export type Finding = {
  id: string;
  severity: Severity;
  title: string;
  where: string;
  section: string;
  rows: string;
  description: string;
  sample: { menu: string; bahan: string; po: string }[];
  suggestion: string;
};

export const severityMeta: Record<Severity, { label: string; tone: Tone; statusLabel: string; bar: string }> = {
  blocker: { label: "Wajib diperbaiki", tone: "red", statusLabel: "Belum diperbaiki", bar: "bg-red-500" },
  check: { label: "Perlu dicek", tone: "amber", statusLabel: "Belum selesai", bar: "bg-amber-400" },
  auto: { label: "Dirapikan otomatis", tone: "green", statusLabel: "Otomatis", bar: "bg-emerald-500" },
};

export const file = {
  name: "List PO for next week.xlsx",
  meta: ["Sukun", "Purchase Order", "P14"],
  uploadId: "UPL-SKN-20261109-002",
  format: "Format PO Sukun v1",
  rowCount: 96,
  uploadedBy: "Dewi Lestari",
  uploadedAt: "09 Nov 2026 14:31",
  status: { label: "Belum selesai dicek", tone: "violet" as Tone },
};

export const steps = ["Perbaiki yang merah (wajib diperbaiki)", "Cek yang kuning, lalu tandai sudah dicek", "Kirim ke PM"];

export const tabs = ["Yang perlu ditangani", "Kolom file", "Dirapikan otomatis", "Hasil data", "Riwayat"];

export const findings: Finding[] = [
  {
    id: "po-number",
    severity: "check",
    title: "Nomor PO tidak ada di file, dibuat otomatis",
    where: "Nomor PO · 96 baris",
    section: "Nomor PO",
    rows: "96 baris",
    description: "File PO tidak punya nomor PO. Sistem membuat nomor tetap, misalnya PO-SKN-P14M1-001. Unggah ulang tidak membuat nomor baru.",
    sample: [
      { menu: "Ayam goreng bumbu kuning", bahan: "Ayam potong paha", po: "PO-SKN-P14M1-003" },
      { menu: "Tempe goreng serundeng", bahan: "Tempe kedelai", po: "PO-SKN-P14M1-004" },
    ],
    suggestion: "Tandai sudah dicek.",
  },
  {
    id: "stock-supplier",
    severity: "check",
    title: "11 bahan diambil dari stok, bukan dibeli",
    where: "Kolom SUPPLIER · 11 baris",
    section: "Kolom SUPPLIER",
    rows: "11 baris",
    description: "Kolom SUPPLIER berisi “STOK” pada 11 bahan. Bahan ini tidak dihitung sebagai pembelian.",
    sample: [
      { menu: "Nasi putih", bahan: "Beras medium", po: "—" },
      { menu: "Sayur bening", bahan: "Garam halus", po: "—" },
    ],
    suggestion: "Pastikan bahan memang dari stok, lalu tandai sudah dicek.",
  },
  {
    id: "menu-name",
    severity: "auto",
    title: "Nama menu yang kosong diisi otomatis",
    where: "Kolom MENU · 58 sel",
    section: "Kolom MENU",
    rows: "58 sel",
    description: "Sel MENU yang kosong diisi dari baris di atasnya, karena file memakai sel yang digabung.",
    sample: [
      { menu: "Ayam goreng bumbu kuning", bahan: "Bawang putih", po: "PO-SKN-P14M1-005" },
      { menu: "Ayam goreng bumbu kuning", bahan: "Kunyit", po: "PO-SKN-P14M1-006" },
    ],
    suggestion: "Tidak perlu tindakan.",
  },
  {
    id: "supplier-name",
    severity: "auto",
    title: "Nama supplier dirapikan",
    where: "Kolom supplier · 23 nilai",
    section: "Kolom supplier",
    rows: "23 nilai",
    description: "Spasi ganda dan huruf besar/kecil pada nama supplier disamakan dengan data referensi.",
    sample: [
      { menu: "Tempe goreng serundeng", bahan: "Tempe kedelai", po: "PO-SKN-P14M1-004" },
      { menu: "Ayam goreng bumbu kuning", bahan: "Ayam potong paha", po: "PO-SKN-P14M1-003" },
    ],
    suggestion: "Tidak perlu tindakan.",
  },
];

export const summary = {
  blockers: findings.filter((f) => f.severity === "blocker").length,
  checks: findings.filter((f) => f.severity === "check").length,
  formatMatch: true,
};
