"use server";

import { revalidatePath } from "next/cache";
import { apiSend } from "@/lib/api";

export type UserActionState = { message?: string; ok?: boolean; resetPath?: string };

const text = (form: FormData, key: string) => (typeof form.get(key) === "string" ? (form.get(key) as string) : "");
const ids = (form: FormData) => form.getAll("kitchenIds").filter((v): v is string => typeof v === "string");

/** One-time link; the browser adds its own origin. An invitation opens the activation page (SCRUM-122). */
const resetPath = (token: unknown, invite = false) => `${process.env.NEXT_PUBLIC_BASE_PATH}/${invite ? "aktivasi" : "reset-password"}/${token}`;

function failure(res: Awaited<ReturnType<typeof apiSend>>): UserActionState {
  if (res.status === 403) return { message: "Anda tidak berhak melakukan ini pada akun tersebut." };
  if (res.status === 404) return { message: "Akun tidak ditemukan." };
  if (res.status === 409) return { message: res.data.error === "conflict" ? "Email sudah terdaftar." : String(res.data.message) };
  if (res.status === 400) {
    const fields = (res.data.details as { fields?: Record<string, string[]> } | undefined)?.fields;
    return { message: fields ? Object.values(fields).flat().join(" ") : "Data tidak valid." };
  }
  return { message: "Gagal. Coba lagi beberapa saat lagi." };
}

export async function createUser(_prev: UserActionState, form: FormData): Promise<UserActionState> {
  const res = await apiSend("/admin/users", "POST", {
    email: text(form, "email"),
    fullName: text(form, "fullName"),
    role: text(form, "role"),
    kitchenIds: ids(form),
  });
  if (!res.ok) return failure(res);
  revalidatePath("/anggota");
  return { ok: true, message: "Undangan dibuat. Kirim tautan aktivasi ini ke anggota (berlaku 72 jam, sekali pakai, tidak ditampilkan lagi):", resetPath: resetPath(res.data.resetToken, true) };
}

export async function saveUser(id: string, _prev: UserActionState, form: FormData): Promise<UserActionState> {
  const res = await apiSend(`/admin/users/${id}`, "PATCH", {
    // A disabled control (your own row) is not submitted: leave the field out, don't send "".
    fullName: text(form, "fullName") || undefined,
    role: text(form, "role") || undefined,
    status: text(form, "status") || undefined,
    kitchenIds: ids(form),
  });
  if (!res.ok) return failure(res);
  revalidatePath("/anggota");
  return { ok: true, message: "Tersimpan." };
}

/** For an account that never activated this is "kirim ulang undangan"; the backend gives it the invitation lifetime. */
export async function issueReset(id: string, invite: boolean): Promise<UserActionState> {
  const res = await apiSend(`/admin/users/${id}/password-reset`, "POST");
  if (!res.ok) return failure(res);
  revalidatePath("/anggota");
  return { ok: true, message: "Kirim tautan ini ke pemilik akun (sekali pakai, tidak ditampilkan lagi):", resetPath: resetPath(res.data.resetToken, invite) };
}

export async function cancelInvite(id: string): Promise<UserActionState> {
  const res = await apiSend(`/admin/users/${id}/invite-cancel`, "POST");
  if (!res.ok) return failure(res);
  revalidatePath("/anggota");
  return { ok: true, message: "Undangan dibatalkan." };
}

export async function revokeSessions(id: string): Promise<UserActionState> {
  const res = await apiSend(`/admin/users/${id}/sessions`, "DELETE");
  return res.ok ? { ok: true, message: "Semua sesi dicabut." } : failure(res);
}

export async function resetMfa(id: string): Promise<UserActionState> {
  const res = await apiSend(`/admin/users/${id}/mfa-reset`, "POST");
  if (!res.ok) return failure(res);
  revalidatePath("/anggota");
  return { ok: true, message: "Verifikasi dua langkah direset." };
}
