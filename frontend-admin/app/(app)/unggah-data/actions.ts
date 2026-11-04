"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { apiFetch, apiSend } from "@/lib/api";
import { DEV_MODE_COOKIE } from "@/lib/dev-mode";
import { getT } from "@/lib/lang-server";
import type { T } from "@/lib/lang";

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

/** A cell exactly as the backend read it (dates as ISO). */
export type RawCell = { value: string | number | boolean | null; type: string };

/** One sheet of the file: column letter → header text. */
export type FileSheet = { name: string; headers: Record<string, string>; headerRow: number | null; skipped?: string };

/** One data row of the file, for the "Validasi Data" grid; `id` is the key `flags` uses. */
export type FileRow = { id: string; sheet: string; row: number; cells: Record<string, RawCell> };

/** What the checks found on one row. */
export type RowFlag = { message: string; label: string };

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
      /** Earliest and latest date inside the file (it can span several months); null when it has none. */
      dateRange: { from: string; to: string } | null;
      sheets: FileSheet[];
      rows: FileRow[];
      flags: Record<string, RowFlag[]>;
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

/** Dev-mode delete (`force`: PUBLISHED too). Returns an error message, or null once it is gone. */
async function forceDelete(path: string): Promise<string | null> {
  const [t, res] = await Promise.all([getT(), apiSend(`${path}force=true`, "DELETE")]);
  if (res.status === 403) return t("Anda tidak memiliki akses untuk menghapus.");
  if (res.status === 409) return typeof res.data.message === "string" ? res.data.message : t("Penghapusan ditolak.");
  if (!res.ok && res.status !== 404) return t("Gagal menghapus. Coba lagi beberapa saat lagi.");
  revalidatePath("/unggah-data");
  revalidatePath("/mapping-validasi");
  revalidatePath("/overview");
  return null;
}

export async function setDevMode(on: boolean): Promise<void> {
  (await cookies()).set(DEV_MODE_COOKIE, on ? "1" : "", { path: "/", maxAge: on ? 60 * 60 * 24 * 30 : 0 });
  revalidatePath("/unggah-data");
  revalidatePath("/mapping-validasi");
}

export async function deleteBatch(id: string): Promise<string | null> {
  return forceDelete(`/upload-batches/${encodeURIComponent(id)}?`);
}

export async function deleteAllBatches(): Promise<string | null> {
  return forceDelete("/upload-batches?");
}

/** The backend's verdict on a rejected upload or check, in Indonesian. */
function failure(t: T, status: number, body: { message?: string; details?: { fields?: Record<string, string[]> } }) {
  if (status === 403) return { ok: false as const, message: body.message ?? t("Anda tidak memiliki akses untuk mengunggah.") };
  const fields = body.details?.fields;
  return { ok: false as const, message: fields ? Object.values(fields).flat().join(" ") : t("Upload gagal ({status}). Coba lagi beberapa saat lagi.", { status }) };
}

/** Reads the picked file and reports what an upload would do, storing nothing (POST /api/upload-batches?dryRun=true). */
export async function checkFile(form: FormData): Promise<CheckResult> {
  const t = await getT();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: t("Pilih file .xlsx atau .csv terlebih dahulu.") };
  if (!form.get("period")) form.delete("period");
  if (!form.get("columnMap")) form.delete("columnMap");

  const res = await apiFetch("/upload-batches?dryRun=true", { method: "POST", body: form });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return failure(t, res.status, body);
  return {
    ok: true,
    ready: body.ready,
    issues: body.issues,
    columnDiff: body.columnDiff,
    rowCount: body.rowCount,
    columns: body.columns,
    fields: body.fields,
    ai: body.ai,
    dateRange: body.dateRange,
    sheets: body.sheets,
    rows: body.rows,
    flags: body.flags,
  };
}

/**
 * Forwards the form to POST /api/upload-batches with the session's token —
 * the browser never holds an API token. Validation, scope and size limits are
 * all the backend's; this only relays its verdict in Indonesian.
 */
export async function uploadFile(_prev: UploadResult | null, form: FormData): Promise<UploadResult> {
  const t = await getT();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: t("Pilih file .xlsx atau .csv terlebih dahulu.") };
  if (!form.get("period")) form.delete("period");
  if (!form.get("columnMap")) form.delete("columnMap");
  if (!form.get("rowEdits")) form.delete("rowEdits");
  // "Publish" on the Validasi Data grid: the uploader has checked every flagged row, so a file held for review goes live now.
  const publish = form.get("publish") === "1";
  form.delete("publish");

  const res = await apiFetch("/upload-batches", { method: "POST", body: form });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return failure(t, res.status, body);
  const result = {
    ok: true as const,
    batchId: body.publicId,
    status: body.status,
    errorCode: body.errorCode,
    errorSummary: body.errorSummary,
    autoPublished: body.autoPublished,
    warning: body.warning?.message,
  };
  if (!publish || body.status !== "NEEDS_REVIEW") return result;
  const published = await apiSend(`/upload-batches/${encodeURIComponent(body.id)}/publish`, "POST");
  revalidatePath("/mapping-validasi");
  if (published.ok) return { ...result, status: "PUBLISHED" };
  return {
    ...result,
    warning:
      published.data.error === "batch_blocked"
        ? t("File tersimpan, tapi masih ada temuan “Wajib diperbaiki”. Tandai sudah dicek di Validasi Data lalu Publish.")
        : t("File tersimpan, tapi belum bisa dipublish. Publish dari Validasi Data."),
  };
}
