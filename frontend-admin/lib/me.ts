import { cache } from "react";
import { apiGet } from "@/lib/api";
import type { Permission, Role } from "@/lib/roles";

export type Kitchen = { id: string; code: string | null; name: string; rolloutStatus?: "PILOT_PHASE_1" | "PHASE_1_COMPARISON" | "PHASE_2A" | "PHASE_2B" | null };

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
