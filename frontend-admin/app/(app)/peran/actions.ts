"use server";

import { revalidatePath } from "next/cache";
import { apiSend } from "@/lib/api";

export type RoleState = { message?: string; ok?: boolean };

export async function saveRolePermissions(role: string, _prev: RoleState, form: FormData): Promise<RoleState> {
  const permissions = form.getAll("permissions").filter((v): v is string => typeof v === "string");
  const res = await apiSend(`/admin/roles/${role}/permissions`, "PUT", { permissions });
  if (res.status === 403) return { message: "Anda tidak dapat memberi izin yang tidak Anda miliki, atau mengubah peran Anda sendiri." };
  if (!res.ok) return { message: "Gagal menyimpan. Coba lagi beberapa saat lagi." };
  revalidatePath("/peran");
  return { ok: true, message: "Tersimpan. Berlaku untuk permintaan berikutnya." };
}
