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
  return { ok: true, ready: body.ready, issues: body.issues, columnDiff: body.columnDiff, rowCount: body.rowCount, columns: body.columns, fields: body.fields, ai: body.ai };
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

  const res = await apiFetch("/upload-batches", { method: "POST", body: form });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return failure(t, res.status, body);
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

/** SCRUM-75/108: code letter per type (SCRUM-160) and whether money comes in or goes out. */
const MANUAL_TYPES = { BELANJA: ["B", "KELUAR"], PENGGAJIAN: ["G", "KELUAR"], INSENTIF: ["I", "KELUAR"], PENERIMAAN: ["P", "MASUK"] } as const;
const MANUAL_HEADER = "id,txn_id,tanggal,tipe,arah,kategori,uraian,nama_barang,nama_penerima,qty,satuan,harga_satuan,jumlah_baris,total,confidence,status_review,catatan_review";
const csvCell = (v: string | number) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));

/**
 * Controlled fallback when a file is not possible: the form becomes the same CSV the template would hold and goes
 * through the ordinary upload (WEB_MANUAL source), so validation, dapur scope and publish are the upload's own.
 * It always makes a new batch, never overwrites one.
 */
export async function submitManualEntry(_prev: UploadResult | null, form: FormData): Promise<UploadResult> {
  const t = await getT();
  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(form.get("date") ?? ""));
  const type = String(form.get("type") ?? "") as keyof typeof MANUAL_TYPES;
  const text = (name: string) => String(form.get(name) ?? "").trim();
  const qtys = form.getAll("qty");
  const units = form.getAll("unit");
  const prices = form.getAll("price");
  const lines = form
    .getAll("item")
    .map((name, i) => ({ name: String(name).trim(), qty: Number(qtys[i]), unit: String(units[i] ?? "").trim(), price: Number(prices[i]) }))
    .filter((l) => l.name);
  if (!date || !(type in MANUAL_TYPES) || !text("category") || !text("description") || !text("counterparty") || lines.length === 0 || lines.some((l) => !(l.qty > 0) || !(l.price >= 0))) {
    return { ok: false, message: t("Lengkapi tanggal, jenis, kategori, uraian, penerima, dan minimal satu barang dengan jumlah dan harga.") };
  }

  const [prefix, direction] = MANUAL_TYPES[type];
  const txnId = `TXN-${prefix}M${Date.now().toString(36).toUpperCase()}`;
  const amounts = lines.map((l) => Math.round(l.qty * l.price));
  const total = amounts.reduce((a, b) => a + b, 0);
  const csv = [
    MANUAL_HEADER,
    ...lines.map((l, i) =>
      [i + 1, txnId, `${date[3]}/${date[2]}/${date[1]}`, type, direction, text("category"), text("description"), l.name, text("counterparty"), l.qty, l.unit, l.price, amounts[i], total, "", "TERKONFIRMASI", ""].map(csvCell).join(","),
    ),
  ].join("\n");

  const upload = new FormData();
  upload.set("file", new File([csv], `entri-manual-${txnId}.csv`, { type: "text/csv" }));
  upload.set("kitchenId", text("kitchenId"));
  upload.set("domain", "CASHFLOW");
  upload.set("sourceSystem", "WEB_MANUAL");
  return uploadFile(null, upload);
}
