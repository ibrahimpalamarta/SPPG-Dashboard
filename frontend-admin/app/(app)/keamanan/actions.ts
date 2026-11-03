"use server";

import { revalidatePath } from "next/cache";
import { apiSend } from "@/lib/api";
import { getT } from "@/lib/lang-server";

export type FormState = { message?: string; ok?: boolean };
export type MfaSetupState = { message?: string; secret?: string; otpauthUrl?: string; recoveryCodes?: string[] };

const text = (form: FormData, key: string) => (typeof form.get(key) === "string" ? (form.get(key) as string) : "");

export async function changePassword(_prev: FormState, form: FormData): Promise<FormState> {
  const t = await getT();
  const newPassword = text(form, "newPassword");
  if (newPassword !== text(form, "confirm")) return { message: t("Konfirmasi password tidak sama.") };

  const res = await apiSend("/auth/password", "POST", { currentPassword: text(form, "currentPassword"), newPassword });
  if (res.ok) return { ok: true, message: t("Password diperbarui. Perangkat lain telah dikeluarkan.") };
  if (res.status === 400) return { message: t("Password baru minimal 12 karakter dan memuat 3 dari: huruf kecil, huruf besar, angka, simbol.") };
  if (res.status === 429) return { message: t("Terlalu banyak percobaan. Coba lagi beberapa menit lagi.") };
  return { message: t("Password saat ini salah.") };
}

export async function startMfaSetup(): Promise<MfaSetupState> {
  const [t, res] = await Promise.all([getT(), apiSend("/auth/mfa/setup", "POST")]);
  if (!res.ok) return { message: t("Verifikasi dua langkah tidak dapat dimulai.") };
  return { secret: res.data.secret as string, otpauthUrl: res.data.otpauthUrl as string };
}

export async function enableMfa(prev: MfaSetupState, form: FormData): Promise<MfaSetupState> {
  const [t, res] = await Promise.all([getT(), apiSend("/auth/mfa/enable", "POST", { code: text(form, "code") })]);
  if (!res.ok) return { ...prev, message: t("Kode tidak valid. Periksa kode di aplikasi autentikator Anda.") };
  revalidatePath("/keamanan");
  return { recoveryCodes: res.data.recoveryCodes as string[] };
}

export async function disableMfa(_prev: FormState, form: FormData): Promise<FormState> {
  const [t, res] = await Promise.all([getT(), apiSend("/auth/mfa/disable", "POST", { password: text(form, "password"), code: text(form, "code") })]);
  if (res.ok) {
    revalidatePath("/keamanan");
    return { ok: true };
  }
  if (res.status === 403) return { message: t("Peran Anda wajib memakai verifikasi dua langkah.") };
  return { message: t("Password atau kode salah.") };
}

export async function revokeSession(id: string) {
  await apiSend(`/auth/sessions/${id}`, "DELETE");
  revalidatePath("/keamanan");
}
