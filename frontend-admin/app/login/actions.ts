"use server";

import { redirect } from "next/navigation";
import { apiFetch, publicPost } from "@/lib/api";
import { clearSessionCookie, setSessionCookie } from "@/lib/session";

export type LoginState = { step: "password" | "mfa"; message?: string; mfaToken?: string };

/** Only same-app paths: `//evil.com` and `https://…` would make login an open redirect. */
const safeReturnTo = (v: FormDataEntryValue | null) => (typeof v === "string" && /^\/(?!\/)[^\\]*$/.test(v) ? v : "/overview");

const text = (form: FormData, key: string) => (typeof form.get(key) === "string" ? (form.get(key) as string) : "");

/**
 * Shared tail of both login steps: a finished login stores the session token
 * in the cookie and goes on; anything else is shown as the backend's message.
 */
async function complete(res: Awaited<ReturnType<typeof publicPost>>, returnTo: string, step: LoginState["step"]): Promise<LoginState> {
  if (res.ok && res.data.status === "ok") {
    await setSessionCookie(res.data.token as string, res.data.expiresAt as string);
    redirect(res.data.mfaEnrollmentRequired ? "/keamanan" : returnTo);
  }
  if (res.ok && res.data.status === "mfa_required") return { step: "mfa", mfaToken: res.data.mfaToken as string };
  if (res.status === 429) return { step, message: "Terlalu banyak percobaan. Coba lagi beberapa menit lagi." };
  return { step, message: (res.data.message as string | undefined) ?? "Tidak dapat masuk. Coba lagi." };
}

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const res = await publicPost("/auth/login", { email: text(form, "email"), password: text(form, "password") });
  return complete(res, safeReturnTo(form.get("returnTo")), "password");
}

/**
 * Local development shortcut: signs in as the dev account behind the chosen
 * role card, with credentials from the server's own env. It is a real backend
 * login — the backend authenticates as usual — so nothing is loosened there.
 * Refuses outright in a production build or without DEV_AUTO_LOGIN=true.
 */
export async function devLogin(_prev: LoginState, form: FormData): Promise<LoginState> {
  if (process.env.NODE_ENV === "production" || process.env.DEV_AUTO_LOGIN !== "true") {
    return { step: "password", message: "Login cepat tidak tersedia." };
  }
  const key = text(form, "role") === "pm" ? "PM" : "OPERASIONAL";
  const email = process.env[`DEV_LOGIN_${key}_EMAIL`];
  const password = process.env[`DEV_LOGIN_${key}_PASSWORD`];
  if (!email || !password) return { step: "password", message: `Akun dev ${key} belum diatur di .env.local.` };

  const res = await publicPost("/auth/login", { email, password });
  return complete(res, safeReturnTo(form.get("returnTo")), "password");
}

export async function verifyMfa(prev: LoginState, form: FormData): Promise<LoginState> {
  const res = await publicPost("/auth/mfa/verify", { mfaToken: prev.mfaToken, code: text(form, "code") });
  const next = await complete(res, safeReturnTo(form.get("returnTo")), "mfa");
  // Keep the challenge so a mistyped code can be retried without the password.
  return { ...next, mfaToken: next.mfaToken ?? prev.mfaToken };
}

export async function logout() {
  // Best effort: the cookie goes either way, and an unreachable backend must
  // not leave the user stuck on a page they cannot sign out of.
  await apiFetch("/auth/logout", { method: "POST" }).catch(() => undefined);
  await clearSessionCookie();
  redirect("/login");
}
