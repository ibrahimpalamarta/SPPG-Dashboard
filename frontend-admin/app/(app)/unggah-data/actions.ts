"use server";

import { apiFetch } from "@/lib/api";

export type UploadedSheet = { name: string; headerRow: number | null; rowCount: number };
export type ColumnDiff = { sheet: string; missing: string[]; unexpected: string[] };
export type MappingSummary = { profileId: string; version: string; records: number; issueCounts: Record<string, number> };

export type UploadResult =
  | {
      ok: true;
      batchId: string;
      status: string;
      errorCode: string | null;
      mappingProfileId: string | null;
      columnDiff: ColumnDiff[];
      mapping: MappingSummary | null;
      rowCount: number;
      errorSummary: string | null;
      sheets: UploadedSheet[];
      warning?: string;
    }
  | { ok: false; message: string };

/**
 * Forwards the form to POST /api/upload-batches with the session's token —
 * the browser never holds an API token. Validation, scope and size limits are
 * all the backend's; this only relays its verdict in Indonesian.
 */
export async function uploadFile(_prev: UploadResult | null, form: FormData): Promise<UploadResult> {
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Pilih file .xlsx atau .csv terlebih dahulu." };
  if (!form.get("period")) form.delete("period");

  const res = await apiFetch("/upload-batches", { method: "POST", body: form });
  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 403) return { ok: false, message: body.message ?? "Anda tidak memiliki akses untuk mengunggah." };
    const fields = body.details?.fields as Record<string, string[]> | undefined;
    return { ok: false, message: fields ? Object.values(fields).flat().join(" ") : `Upload gagal (${res.status}). Coba lagi beberapa saat lagi.` };
  }
  return {
    ok: true,
    batchId: body.publicId,
    status: body.status,
    errorCode: body.errorCode,
    mappingProfileId: body.mappingProfileId,
    columnDiff: body.columnDiff ?? [],
    mapping: body.mapping,
    rowCount: body.rowCount,
    errorSummary: body.errorSummary,
    sheets: body.sheets,
    warning: body.warning?.message,
  };
}
