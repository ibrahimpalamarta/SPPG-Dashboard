"use server";

import { revalidatePath } from "next/cache";
import { apiFetch, apiSend } from "@/lib/api";

export type ColumnDiff = { sheet: string; missing: string[]; unexpected: string[] };

/** SCRUM-150: the AI's reading of unknown columns and a fix per issue code; null when it had nothing to say or is off. */
export type UploadAdvice = {
  columns: { header: string; readAs: string | null; reason: string }[];
  issues: { code: string; advice: string }[];
};

/** One header of the file and the SOP field it is read as (null: not used). `sheet|column` identifies it in `columnMap`. */
export type FileColumn = { sheet: string; column: string; header: string; field: string | null };

/** A canonical field of the SOP and the header its template writes it under. */
export type SopField = { field: string; header: string };

/** The "Siap diunggah" / "Perlu dicek" card, built before anything is stored. */
export type CheckResult =
  | {
      ok: true;
      ready: boolean;
      issues: { code: string; message: string; label: string; count: number }[];
      columnDiff: ColumnDiff[];
      rowCount: number;
      columns: FileColumn[];
      fields: SopField[];
      ai: UploadAdvice | null;
    }
  | { ok: false; message: string };

export type UploadResult =
  | {
      ok: true;
      batchId: string;
      status: string;
      errorCode: string | null;
      errorSummary: string | null;
      autoPublished: boolean;
      warning?: string;
    }
  | { ok: false; message: string };

/** Returns an error message, or null once the batch is gone. */
export async function deleteBatch(id: string): Promise<string | null> {
  const res = await apiSend(`/upload-batches/${encodeURIComponent(id)}`, "DELETE");
  if (res.status === 403) return "Anda tidak memiliki akses untuk menghapus batch ini.";
  if (res.status === 409) return "Batch yang sudah dipublish tidak bisa dihapus.";
  if (!res.ok && res.status !== 404) return "Gagal menghapus. Coba lagi beberapa saat lagi.";
  revalidatePath("/unggah-data");
  revalidatePath("/mapping-validasi");
  return null;
}

/** The backend's verdict on a rejected upload or check, in Indonesian. */
function failure(status: number, body: { message?: string; details?: { fields?: Record<string, string[]> } }) {
  if (status === 403) return { ok: false as const, message: body.message ?? "Anda tidak memiliki akses untuk mengunggah." };
  const fields = body.details?.fields;
  return { ok: false as const, message: fields ? Object.values(fields).flat().join(" ") : `Upload gagal (${status}). Coba lagi beberapa saat lagi.` };
}

/** Reads the picked file and reports what an upload would do, storing nothing (POST /api/upload-batches?dryRun=true). */
export async function checkFile(form: FormData): Promise<CheckResult> {
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Pilih file .xlsx atau .csv terlebih dahulu." };
  if (!form.get("period")) form.delete("period");
  if (!form.get("columnMap")) form.delete("columnMap");

  const res = await apiFetch("/upload-batches?dryRun=true", { method: "POST", body: form });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return failure(res.status, body);
  return { ok: true, ready: body.ready, issues: body.issues, columnDiff: body.columnDiff, rowCount: body.rowCount, columns: body.columns, fields: body.fields, ai: body.ai };
}

/**
 * Forwards the form to POST /api/upload-batches with the session's token —
 * the browser never holds an API token. Validation, scope and size limits are
 * all the backend's; this only relays its verdict in Indonesian.
 */
export async function uploadFile(_prev: UploadResult | null, form: FormData): Promise<UploadResult> {
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Pilih file .xlsx atau .csv terlebih dahulu." };
  if (!form.get("period")) form.delete("period");
  if (!form.get("columnMap")) form.delete("columnMap");

  const res = await apiFetch("/upload-batches", { method: "POST", body: form });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return failure(res.status, body);
  return {
    ok: true,
    batchId: body.publicId,
    status: body.status,
    errorCode: body.errorCode,
    errorSummary: body.errorSummary,
    autoPublished: body.autoPublished,
    warning: body.warning?.message,
  };
}
