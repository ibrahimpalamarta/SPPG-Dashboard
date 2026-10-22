import { auth0 } from "@/lib/auth0";

/**
 * Server-side GET to the backend with the session's access token. The backend
 * decides permission and kitchen scope; a non-2xx is thrown to app/error.tsx.
 */
export async function apiGet<T>(path: string): Promise<T> {
  const { token } = await auth0.getAccessToken();
  const res = await fetch(`${process.env.API_BASE_URL}/api${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`GET /api${path} gagal: ${res.status}`);
  return res.json();
}
