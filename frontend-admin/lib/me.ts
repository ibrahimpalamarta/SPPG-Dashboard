import { cache } from "react";
import { cookies } from "next/headers";
import { apiGet } from "@/lib/api";
import { KITCHEN_COOKIE } from "@/lib/nav";
import type { Permission, Role } from "@/lib/roles";

export type Kitchen = { id: string; code: string | null; name: string };

export type Me = {
  id: string;
  email: string | null;
  fullName: string | null;
  role: Role;
  permissions: Permission[];
  mfaEnabled: boolean;
  mfaEnrollmentRequired: boolean;
  kitchens: Kitchen[];
};

/**
 * GET /api/me with the session token, once per request. The backend
 * re-checks permission and kitchen scope on every call; this only decides what
 * the shell draws.
 */
export const getMe = cache(() => apiGet<Me>("/me"));

/**
 * The kitchen picked in the header, if it is still inside the user's scope —
 * a stale or tampered cookie falls back to the first kitchen in scope.
 */
export async function selectedKitchen(me: Me): Promise<Kitchen | undefined> {
  const id = (await cookies()).get(KITCHEN_COOKIE)?.value;
  return me.kitchens.find((k) => k.id === id) ?? me.kitchens[0];
}
