"use server";

import { auth0 } from "@/lib/auth0";

export type UploadedSheet = { name: string; headerRow: number | null; rowCount: number };

export type UploadResult =
  | {
      ok: true;
      batchId: string;
      status: string;
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
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Pilih file .xlsx terlebih dahulu." };
  if (!form.get("period")) form.delete("period");

  const { token } = await auth0.getAccessToken();
  const res = await fetch(`${process.env.API_BASE_URL}/api/upload-batches`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 403) return { ok: false, message: body.message ?? "Anda tidak memiliki akses untuk mengunggah." };
    const fields = body.details?.fields as Record<string, string[]> | undefined;
    return { ok: false, message: fields ? Object.values(fields).flat().join(" ") : "Upload gagal. Coba lagi beberapa saat lagi." };
  }
  return {
    ok: true,
    batchId: body.publicId,
    status: body.status,
    rowCount: body.rowCount,
    errorSummary: body.errorSummary,
    sheets: body.sheets,
    warning: body.warning?.message,
  };
}
