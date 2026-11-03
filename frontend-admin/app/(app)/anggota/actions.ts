"use server";

import { revalidatePath } from "next/cache";
import { apiSend } from "@/lib/api";
import { dateLocale, type T } from "@/lib/lang";
import { getLang, getT } from "@/lib/lang-server";

export type UserActionState = {
  message?: string;
  ok?: boolean;
  email?: string;
  role?: string;
  emailed?: boolean;
  expiresAt?: string;
  token?: string;
};

const text = (form: FormData, key: string) => (typeof form.get(key) === "string" ? (form.get(key) as string) : "");
const ids = (form: FormData) => form.getAll("kitchenIds").filter((v): v is string => typeof v === "string" && v !== "");

/** SCRUM-144: Data Operasional is tied to exactly one dapur; the backend rejects any other count. */
const KITCHEN_SCOPED = ["DATA_ADMIN"];
const oneKitchen = (t: T): UserActionState => ({ message: t("Pilih satu dapur untuk role ini.") });

function failure(t: T, res: Awaited<ReturnType<typeof apiSend>>): UserActionState {
  if (res.status === 403) return { message: t("Anda tidak berhak melakukan ini pada akun tersebut.") };
  if (res.status === 404) return { message: t("Akun tidak ditemukan.") };
  if (res.status === 409) return { message: res.data.error === "conflict" ? t("Email sudah terdaftar.") : String(res.data.message) };
  if (res.status === 400) {
    const fields = (res.data.details as { fields?: Record<string, string[]> } | undefined)?.fields;
    return { message: fields ? Object.values(fields).flat().join(" ") : t("Data tidak valid.") };
  }
  return { message: t("Gagal. Coba lagi beberapa saat lagi.") };
}

export async function createUser(_prev: UserActionState, form: FormData): Promise<UserActionState> {
  const t = await getT();
  const email = text(form, "email");
  const role = text(form, "role");
  const scoped = KITCHEN_SCOPED.includes(role);
  const kitchenIds = scoped ? ids(form) : [];
  if (scoped && kitchenIds.length !== 1) return oneKitchen(t);
  const res = await apiSend("/admin/users", "POST", {
    email,
    fullName: text(form, "fullName"),
    role,
    kitchenIds,
    message: text(form, "message") || undefined,
  });
  if (!res.ok) return failure(t, res);
  revalidatePath("/anggota");
  const data = res.data as Record<string, unknown>;
  return { ok: true, email, role, emailed: Boolean(data.emailed), expiresAt: String(data.resetTokenExpiresAt), token: String(data.resetToken) };
}

export async function saveUser(id: string, _prev: UserActionState, form: FormData): Promise<UserActionState> {
  const t = await getT();
  const role = text(form, "role");
  const scoped = KITCHEN_SCOPED.includes(role);
  // A role change replaces the whole scope: the picked dapur, or none (all dapur) for Admin.
  const kitchenIds = role ? (scoped ? ids(form) : []) : undefined;
  if (scoped && kitchenIds?.length !== 1) return oneKitchen(t);
  const res = await apiSend(`/admin/users/${id}`, "PATCH", {
    // A disabled control (your own row) is not submitted: leave the field out, don't send "".
    fullName: text(form, "fullName") || undefined,
    role: role || undefined,
    status: text(form, "status") || undefined,
    kitchenIds,
  });
  if (!res.ok) return failure(t, res);
  revalidatePath("/anggota");
  return { ok: true, message: t("Tersimpan.") };
}

export async function setStatus(id: string, status: "ACTIVE" | "INACTIVE"): Promise<UserActionState> {
  const [t, res] = await Promise.all([getT(), apiSend(`/admin/users/${id}`, "PATCH", { status })]);
  if (!res.ok) return failure(t, res);
  revalidatePath("/anggota");
  return { ok: true, message: status === "ACTIVE" ? t("Akun diaktifkan.") : t("Akun dinonaktifkan.") };
}

/** For an account that never activated this is "kirim ulang undangan"; the backend gives it the invitation lifetime. */
export async function issueReset(id: string): Promise<UserActionState> {
  const [t, lang, res] = await Promise.all([getT(), getLang(), apiSend(`/admin/users/${id}/password-reset`, "POST")]);
  if (!res.ok) return failure(t, res);
  revalidatePath("/anggota");
  const until = new Date(String(res.data.resetTokenExpiresAt)).toLocaleDateString(dateLocale(lang), { day: "numeric", month: "short" });
  return { ok: true, message: t("Undangan dibuat ulang · email terkirim · berlaku s/d {until}.", { until }) };
}

export async function cancelInvite(id: string, email: string | null): Promise<UserActionState> {
  const [t, res] = await Promise.all([getT(), apiSend(`/admin/users/${id}/invite-cancel`, "POST")]);
  if (!res.ok) return failure(t, res);
  revalidatePath("/anggota");
  return { ok: true, message: t("Undangan untuk {email} dibatalkan · link tidak berlaku.", { email: email ?? t("akun ini") }) };
}
