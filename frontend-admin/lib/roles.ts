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

export const ROLES = ["SUPER_ADMIN", "DATA_ADMIN", "CMS_ADMIN", "INTERNAL", "PUBLIC"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Project Manager MBG",
  DATA_ADMIN: "Data Operasional",
  INTERNAL: "Internal (lihat saja)",
  CMS_ADMIN: "Admin CMS",
  PUBLIC: "Publik",
};
