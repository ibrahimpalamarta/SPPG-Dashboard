import type { Tone } from "@/components/ui/badge";

export type Severity = "blocker" | "check" | "auto";

export type Finding = {
  id: string;
  severity: Severity;
  title: string;
  section: string;
  rows: string;
  description: string;
};

export type Batch = {
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

export const severityMeta: Record<Severity, { label: string; tone: Tone; statusLabel: string }> = {
  blocker: { label: "Wajib diperbaiki", tone: "red", statusLabel: "Belum diperbaiki" },
  check: { label: "Perlu dicek", tone: "amber", statusLabel: "Belum selesai" },
  auto: { label: "Dirapikan otomatis", tone: "green", statusLabel: "Otomatis" },
};

export const tabs = ["Yang perlu ditangani", "Kolom file", "Dirapikan otomatis", "Hasil data", "Riwayat"];

/**
 * Findings the backend persists on the batch today. Row-level issues, column diff and
 * totals are not stored yet (B-MAPOUT, B-SCHEMA); extend here when they are.
 */
export function batchFindings(b: Batch): Finding[] {
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
  return out;
}
