"use server";

import { redirect } from "next/navigation";
import { publicPost } from "@/lib/api";
import { setSessionCookie } from "@/lib/session";

export type ResetState = { message?: string };

export async function resetPassword(token: string, _prev: ResetState, form: FormData): Promise<ResetState> {
  const password = form.get("password");
  if (typeof password !== "string" || password !== form.get("confirm")) return { message: "Konfirmasi password tidak sama." };

  const res = await publicPost("/auth/reset-password", { token, password });
  if (res.ok) {
    // SCRUM-122: the first password of an invited account comes back with a session.
    if (res.data.status === "ok") {
      await setSessionCookie(res.data.token as string, res.data.expiresAt as string);
      redirect(res.data.mfaEnrollmentRequired ? "/keamanan" : "/overview");
    }
    redirect("/login?reset=1");
  }
  if (res.status === 400 && res.data.error === "validation_error") {
    return { message: "Password minimal 12 karakter dan memuat 3 dari: huruf kecil, huruf besar, angka, simbol." };
  }
  if (res.status === 429) return { message: "Terlalu banyak percobaan. Coba lagi beberapa menit lagi." };
  return { message: (res.data.message as string | undefined) ?? "Password tidak dapat diubah." };
}
