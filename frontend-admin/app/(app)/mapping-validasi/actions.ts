"use server";

import { revalidatePath } from "next/cache";
import { apiSend } from "@/lib/api";

/** "Tandai sudah dicek" for every open issue of one code (SCRUM-51). Returns an error message, or null on success. */
export async function resolveIssues(uploadBatchId: string, code: string, note: string): Promise<string | null> {
  if (!note.trim()) return "Isi catatan dulu: jelaskan kenapa temuan ini sudah aman.";
  const res = await apiSend("/validation-issues/resolve", "POST", { uploadBatchId, code, note });
  if (res.status === 403) return "Anda tidak memiliki akses untuk menandai temuan ini.";
  if (res.status === 409) return "Temuan hanya bisa ditandai saat file masih dicek Data Operasional.";
  if (!res.ok) return "Gagal menyimpan. Coba lagi beberapa saat lagi.";
  revalidatePath("/mapping-validasi");
  return null;
}
