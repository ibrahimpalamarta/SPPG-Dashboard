"use server";

import { revalidatePath } from "next/cache";
import { apiSend } from "@/lib/api";
import { getT } from "@/lib/lang-server";

export type ReferenceEntryActionState = { message?: string; ok?: boolean };

const TEXT_FIELDS = ["artinya", "contoh", "aturan", "akibat", "catatan"] as const;

/** SCRUM-123: only reference:edit (Admin) gets here; the backend checks it again. */
export async function saveReferenceEntry(id: string, _prev: ReferenceEntryActionState, form: FormData): Promise<ReferenceEntryActionState> {
  const body: Record<string, unknown> = {};
  for (const key of TEXT_FIELDS) {
    const v = form.get(key);
    if (v !== null) body[key] = v;
  }
  const pilihan = form.get("pilihan");
  if (typeof pilihan === "string") {
    body.pilihan = pilihan
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const [t, res] = await Promise.all([getT(), apiSend(`/reference-entries/${id}`, "PATCH", body)]);
  if (res.ok) {
    revalidatePath("/referensi-data");
    return { ok: true, message: t("Tersimpan.") };
  }
  if (res.status === 403) return { message: t("Hanya Admin yang dapat mengubah Data Reference.") };
  if (res.status === 400) return { message: t("Data tidak valid.") };
  return { message: t("Gagal. Coba lagi beberapa saat lagi.") };
}
