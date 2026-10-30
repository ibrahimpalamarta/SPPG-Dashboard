"use server";

import { revalidatePath } from "next/cache";
import { apiSend } from "@/lib/api";

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
const ONE_KITCHEN: UserActionState = { message: "Pilih satu dapur untuk role ini." };

const untilDate = (iso: unknown) => new Date(String(iso)).toLocaleDateString("id-ID", { day: "numeric", month: "short" });

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
  const email = text(form, "email");
  const role = text(form, "role");
  const scoped = KITCHEN_SCOPED.includes(role);
  const kitchenIds = scoped ? ids(form) : [];
  if (scoped && kitchenIds.length !== 1) return ONE_KITCHEN;
  const res = await apiSend("/admin/users", "POST", {
    email,
    fullName: text(form, "fullName"),
    role,
    kitchenIds,
    message: text(form, "message") || undefined,
  });
  if (!res.ok) return failure(res);
  revalidatePath("/anggota");
  const data = res.data as Record<string, unknown>;
  return { ok: true, email, role, emailed: Boolean(data.emailed), expiresAt: String(data.resetTokenExpiresAt), token: String(data.resetToken) };
}

export async function saveUser(id: string, _prev: UserActionState, form: FormData): Promise<UserActionState> {
  const role = text(form, "role");
  const scoped = KITCHEN_SCOPED.includes(role);
  // A role change replaces the whole scope: the picked dapur, or none (all dapur) for Admin.
  const kitchenIds = role ? (scoped ? ids(form) : []) : undefined;
  if (scoped && kitchenIds?.length !== 1) return ONE_KITCHEN;
  const res = await apiSend(`/admin/users/${id}`, "PATCH", {
    // A disabled control (your own row) is not submitted: leave the field out, don't send "".
    fullName: text(form, "fullName") || undefined,
    role: role || undefined,
    status: text(form, "status") || undefined,
    kitchenIds,
  });
  if (!res.ok) return failure(res);
  revalidatePath("/anggota");
  return { ok: true, message: "Tersimpan." };
}

export async function setStatus(id: string, status: "ACTIVE" | "INACTIVE"): Promise<UserActionState> {
  const res = await apiSend(`/admin/users/${id}`, "PATCH", { status });
  if (!res.ok) return failure(res);
  revalidatePath("/anggota");
  return { ok: true, message: status === "ACTIVE" ? "Akun diaktifkan." : "Akun dinonaktifkan." };
}

/** For an account that never activated this is "kirim ulang undangan"; the backend gives it the invitation lifetime. */
export async function issueReset(id: string): Promise<UserActionState> {
  const res = await apiSend(`/admin/users/${id}/password-reset`, "POST");
  if (!res.ok) return failure(res);
  revalidatePath("/anggota");
  const until = `berlaku s/d ${untilDate(res.data.resetTokenExpiresAt)}`;
  return { ok: true, message: `Undangan dibuat ulang · email terkirim · ${until}.` };
}

export async function cancelInvite(id: string, email: string | null): Promise<UserActionState> {
  const res = await apiSend(`/admin/users/${id}/invite-cancel`, "POST");
  if (!res.ok) return failure(res);
  revalidatePath("/anggota");
  return { ok: true, message: `Undangan untuk ${email ?? "akun ini"} dibatalkan · link tidak berlaku.` };
}
