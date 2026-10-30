/** Plain data, no server imports: the client sidebar and the admin pages both need it. */
/** Mirrors backend PERMISSIONS (backend/src/auth/roles.ts). */
export const PERMISSIONS = [
  "upload:create",
  "upload:view",
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

/** Mirrors backend ROLES (SCRUM-152). */
export const ROLES = ["ADMIN", "DATA_ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  DATA_ADMIN: "Data Operasional",
};
