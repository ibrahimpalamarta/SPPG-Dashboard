import { cookies } from "next/headers";

/**
 * The backend session token lives only in this httpOnly cookie, so page
 * scripts never see it; server code reads it and forwards it as a Bearer
 * token. The cookie is just a handle: revoking the session in the backend
 * kills it regardless of what the browser still holds.
 */
export const SESSION_COOKIE = "sppg_session";

// Scoped to the admin app so frontend-public (same host) never receives it.
const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: process.env.NEXT_PUBLIC_BASE_PATH } as const;

export async function getSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

export async function setSessionCookie(token: string, expiresAt: string) {
  (await cookies()).set(SESSION_COOKIE, token, { ...options, expires: new Date(expiresAt) });
}

export async function clearSessionCookie() {
  (await cookies()).set(SESSION_COOKIE, "", { ...options, maxAge: 0 });
}
