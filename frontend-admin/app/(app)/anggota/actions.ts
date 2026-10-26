"use server";

import { revalidatePath } from "next/cache";
import { apiSend } from "@/lib/api";

export type UserActionState = {
  message?: string;
  ok?: boolean;
  resetPath?: string;
  email?: string;
  role?: string;
  emailed?: boolean;
  expiresAt?: string;
};

const text = (form: FormData, key: string) => (typeof form.get(key) === "string" ? (form.get(key) as string) : "");
const ids = (form: FormData) => form.getAll("kitchenIds").filter((v): v is string => typeof v === "string" && v !== "");

/** One-time activation link (SCRUM-122); the browser adds its own origin. */
const activationPath = (token: unknown) => `${process.env.NEXT_PUBLIC_BASE_PATH}/aktivasi/${token}`;
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
  const res = await apiSend("/admin/users", "POST", {
    email,
    fullName: text(form, "fullName"),
    role,
    kitchenIds: ids(form),
    message: text(form, "message") || undefined,
  });
  if (!res.ok) return failure(res);
  revalidatePath("/anggota");
  const data = res.data as Record<string, unknown>;
  return { ok: true, email, role, emailed: Boolean(data.emailed), expiresAt: String(data.resetTokenExpiresAt), resetPath: activationPath(data.resetToken) };
}

export async function saveUser(id: string, _prev: UserActionState, form: FormData): Promise<UserActionState> {
  const res = await apiSend(`/admin/users/${id}`, "PATCH", {
    // A disabled control (your own row) is not submitted: leave the field out, don't send "".
    fullName: text(form, "fullName") || undefined,
    role: text(form, "role") || undefined,
    status: text(form, "status") || undefined,
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
