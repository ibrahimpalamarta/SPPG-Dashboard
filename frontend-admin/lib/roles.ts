/** Plain data, no server imports: the client sidebar and the admin pages both need it. */
/** Mirrors backend PERMISSIONS (backend/src/auth/roles.ts). */
export const PERMISSIONS = [
  "upload:create",
  "upload:view",
  "batch:review",
  "batch:publish",
  "mapping:view",
  "mapping:propose",
  "reference:view",
  "reference:edit",
  "dashboard:view",
  "users:read",
  "users:manage",
  "settings:manage",
  "audit:read",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

/** Mirrors backend ROLES (PRD Oktober 2026 §3). */
export const ROLES = [
  "SUPER_ADMIN",
  "MANAGEMENT",
  "FINANCE",
  "KEPALA_KITCHEN",
  "DATA_ADMIN",
  "AHLI_GIZI",
  "DATA_STEWARD",
] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Admin Sistem (PM MBG)",
  MANAGEMENT: "Management",
  FINANCE: "Finance",
  KEPALA_KITCHEN: "Kepala Kitchen",
  DATA_ADMIN: "PIC/Data Admin Kitchen",
  AHLI_GIZI: "Ahli Gizi",
  DATA_STEWARD: "Data Steward",
};
