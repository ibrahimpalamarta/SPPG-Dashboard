"use server";

import { publicPost } from "@/lib/api";

export type ForgotState = { message?: string; sent?: boolean };

export async function requestReset(_prev: ForgotState, form: FormData): Promise<ForgotState> {
  const email = form.get("email");
  const res = await publicPost("/auth/forgot-password", { email: typeof email === "string" ? email : "" });
  if (res.ok) return { sent: true };
  if (res.status === 429) return { message: "Terlalu banyak percobaan. Coba lagi beberapa menit lagi." };
  if (res.status === 400) return { message: "Masukkan alamat email yang valid." };
  return { message: "Permintaan tidak dapat diproses. Coba lagi." };
}
