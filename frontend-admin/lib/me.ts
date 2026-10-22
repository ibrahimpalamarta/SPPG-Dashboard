import { cache } from "react";
import { cookies } from "next/headers";
import { auth0 } from "@/lib/auth0";
import { KITCHEN_COOKIE } from "@/lib/nav";

/** Mirrors backend `PERMISSIONS` (backend/src/auth/roles.ts). */
export type Permission =
  | "upload:create"
  | "upload:view"
  | "batch:review"
  | "batch:publish"
  | "mapping:view"
  | "mapping:propose"
  | "reference:view"
  | "reference:edit"
  | "member:invite"
  | "dashboard:view";

export type Kitchen = { id: string; code: string | null; name: string };

export type Me = {
  id: string;
  email: string | null;
  fullName: string | null;
  role: "SUPER_ADMIN" | "DATA_ADMIN" | "CMS_ADMIN" | "INTERNAL" | "PUBLIC";
  permissions: Permission[];
  kitchens: Kitchen[];
};

/**
 * GET /api/me with the session's access token, once per request. The backend
 * re-checks permission and kitchen scope on every call; this only decides what
 * the shell draws.
 */
export const getMe = cache(async (): Promise<Me> => {
  const { token } = await auth0.getAccessToken();
  const res = await fetch(`${process.env.API_BASE_URL}/api/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`GET /api/me gagal: ${res.status}`);
  return res.json();
});

/**
 * The kitchen picked in the header, if it is still inside the user's scope —
 * a stale or tampered cookie falls back to the first kitchen in scope.
 */
export async function selectedKitchen(me: Me): Promise<Kitchen | undefined> {
  const id = (await cookies()).get(KITCHEN_COOKIE)?.value;
  return me.kitchens.find((k) => k.id === id) ?? me.kitchens[0];
}
