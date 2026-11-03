"use server";

import { revalidatePath } from "next/cache";
import { apiSend } from "@/lib/api";
import { getT } from "@/lib/lang-server";

/** "Tandai sudah dicek" for every open issue of one code (SCRUM-51). Returns an error message, or null on success. */
export async function resolveIssues(uploadBatchId: string, code: string, note: string): Promise<string | null> {
  const t = await getT();
  if (!note.trim()) return t("Isi catatan dulu: jelaskan kenapa temuan ini sudah aman.");
  const res = await apiSend("/validation-issues/resolve", "POST", { uploadBatchId, code, note });
  if (res.status === 403) return t("Anda tidak memiliki akses untuk menandai temuan ini.");
  if (res.status === 409) return t("Temuan hanya bisa ditandai saat file masih dicek Data Operasional.");
  if (!res.ok) return t("Gagal menyimpan. Coba lagi beberapa saat lagi.");
  revalidatePath("/mapping-validasi");
  return null;
}

/** SCRUM-151: "Setujui & Publish" by Data Operasional. Returns an error message, or null on success. */
export async function publishBatch(id: string): Promise<string | null> {
  const [t, res] = await Promise.all([getT(), apiSend(`/upload-batches/${encodeURIComponent(id)}/publish`, "POST")]);
  if (res.status === 403) return t("Anda tidak memiliki akses ke file ini.");
  if (res.status === 409) {
    return res.data.error === "batch_blocked" ? t("Masih ada temuan “Wajib diperbaiki” yang belum ditandai sudah dicek.") : t("Status file sudah berubah. Muat ulang halaman.");
  }
  if (!res.ok) return t("Gagal menyimpan. Coba lagi beberapa saat lagi.");
  revalidatePath("/mapping-validasi");
  return null;
}
