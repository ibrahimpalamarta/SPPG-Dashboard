"use server";

import { revalidatePath } from "next/cache";
import { apiSend } from "@/lib/api";

export type KitchenActionState = { message?: string; ok?: boolean };

/** SCRUM-123: only reference:edit (PM MBG) gets here; the backend checks it again. */
export async function saveKitchen(id: string, _prev: KitchenActionState, form: FormData): Promise<KitchenActionState> {
  const res = await apiSend(`/kitchens/${id}`, "PATCH", { name: form.get("name"), status: form.get("status") });
  if (res.ok) {
    revalidatePath("/referensi-data");
    return { ok: true, message: "Tersimpan." };
  }
  if (res.status === 403) return { message: "Hanya Project Manager MBG yang dapat mengubah Data Reference." };
  if (res.status === 409) return { message: "Nama dapur sudah dipakai." };
  if (res.status === 400) return { message: "Nama wajib diisi (maks. 120 karakter)." };
  return { message: "Gagal. Coba lagi beberapa saat lagi." };
}
