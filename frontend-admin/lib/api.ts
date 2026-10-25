import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionToken } from "@/lib/session";

const api = (path: string) => `${process.env.API_BASE_URL}/api${path}`;

/**
 * Who is really calling, for the backend's rate limiter and audit trail: from
 * here every user arrives from this server's address. Only the last
 * X-Forwarded-For entry is used — it is the one our own load balancer wrote.
 */
async function clientHeaders(): Promise<Record<string, string>> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",").at(-1)?.trim();
  return { ...(ip && { "X-Forwarded-For": ip }), "User-Agent": h.get("user-agent") ?? "" };
}

/**
 * Server-side fetch to the backend with the session token. Two outcomes are
 * handled once, for every caller: a dead session sends the user to log in
 * again, and a role that must use MFA but has not enrolled is sent to enrol.
 * Everything else (including 403 for a missing permission) is the caller's.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getSessionToken();
  if (!token) redirect("/login");

  const res = await fetch(api(path), {
    ...init,
    headers: { ...init.headers, ...(await clientHeaders()), Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (res.status === 401) redirect("/sesi-berakhir");
  if (res.status === 403 && (await res.clone().json().catch(() => null))?.error === "mfa_enrollment_required") redirect("/keamanan");
  return res;
}

/** The backend decides permission and kitchen scope; a non-2xx is thrown to app/error.tsx. */
export async function apiGet<T>(path: string): Promise<T> {
  const res = await apiFetch(path);
  if (!res.ok) throw new Error(`GET /api${path} gagal: ${res.status}`);
  return res.json();
}

/** JSON POST/PUT/PATCH/DELETE for actions; returns the status and parsed body so each action words its own error. */
export async function apiSend(path: string, method: string, body?: unknown): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const res = await apiFetch(path, {
    method,
    ...(body !== undefined && { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  });
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
}

/** Unauthenticated call (login, MFA step, reset): no session exists yet. */
export async function publicPost(path: string, body: unknown): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const res = await fetch(api(path), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await clientHeaders()) },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
}
