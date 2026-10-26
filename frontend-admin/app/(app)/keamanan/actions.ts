"use server";

import { revalidatePath } from "next/cache";
import { apiSend } from "@/lib/api";

export type FormState = { message?: string; ok?: boolean };
export type MfaSetupState = { message?: string; secret?: string; otpauthUrl?: string; recoveryCodes?: string[] };

const text = (form: FormData, key: string) => (typeof form.get(key) === "string" ? (form.get(key) as string) : "");

const WEAK = "Password baru minimal 12 karakter dan memuat 3 dari: huruf kecil, huruf besar, angka, simbol.";

export async function changePassword(_prev: FormState, form: FormData): Promise<FormState> {
  const newPassword = text(form, "newPassword");
  if (newPassword !== text(form, "confirm")) return { message: "Konfirmasi password tidak sama." };

  const res = await apiSend("/auth/password", "POST", { currentPassword: text(form, "currentPassword"), newPassword });
  if (res.ok) return { ok: true, message: "Password diperbarui. Perangkat lain telah dikeluarkan." };
  if (res.status === 400) return { message: WEAK };
  if (res.status === 429) return { message: "Terlalu banyak percobaan. Coba lagi beberapa menit lagi." };
  return { message: "Password saat ini salah." };
}

export async function startMfaSetup(): Promise<MfaSetupState> {
  const res = await apiSend("/auth/mfa/setup", "POST");
  if (!res.ok) return { message: "Verifikasi dua langkah tidak dapat dimulai." };
  return { secret: res.data.secret as string, otpauthUrl: res.data.otpauthUrl as string };
}

export async function enableMfa(prev: MfaSetupState, form: FormData): Promise<MfaSetupState> {
  const res = await apiSend("/auth/mfa/enable", "POST", { code: text(form, "code") });
  if (!res.ok) return { ...prev, message: "Kode tidak valid. Periksa kode di aplikasi autentikator Anda." };
  revalidatePath("/keamanan");
  return { recoveryCodes: res.data.recoveryCodes as string[] };
}

export async function disableMfa(_prev: FormState, form: FormData): Promise<FormState> {
  const res = await apiSend("/auth/mfa/disable", "POST", { password: text(form, "password"), code: text(form, "code") });
  if (res.ok) {
    revalidatePath("/keamanan");
    return { ok: true };
  }
  if (res.status === 403) return { message: "Peran Anda wajib memakai verifikasi dua langkah." };
  return { message: "Password atau kode salah." };
}

export async function revokeSession(id: string) {
  await apiSend(`/auth/sessions/${id}`, "DELETE");
  revalidatePath("/keamanan");
}
