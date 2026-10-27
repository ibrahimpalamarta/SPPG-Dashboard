/** PRD Oktober 2026 §3 + US-15. SUPER_ADMIN = Admin Sistem / PM MBG. */
export const ROLES = [
  'SUPER_ADMIN',
  'MANAGEMENT',
  'FINANCE',
  'KEPALA_KITCHEN',
  'DATA_ADMIN',
  'AHLI_GIZI',
  'DATA_STEWARD',
] as const;
export type Role = (typeof ROLES)[number];

/** Roles whose scope is "kitchen sendiri": no scope rows means no kitchens, never all. */
export const KITCHEN_SCOPED_ROLES: readonly Role[] = ['KEPALA_KITCHEN', 'DATA_ADMIN', 'AHLI_GIZI'];

/**
 * The catalogue of things a route can demand. Which role holds which lives in
 * `role_permissions` (edited through the admin API, read via rbac-store.ts);
 * this list only says what exists, so a stale row for a retired permission is
 * ignored rather than trusted.
 *
 *   users:read / users:manage   akun, sesi, undangan
 *   settings:manage             peta role -> permission
 *   audit:read                  audit trail
 *
 * SUPER_ADMIN (Project Manager MBG) always holds all of them except
 * MAKER_PERMISSIONS and is not stored in the table.
 */
export const PERMISSIONS = [
  'upload:create',
  'upload:view',
  'batch:review',
  'batch:publish',
  'mapping:view',
  'mapping:propose',
  'reference:view',
  'reference:edit',
  'dashboard:view',
  'users:read',
  'users:manage',
  'settings:manage',
  'audit:read',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

/** Four-eyes (PRD AC-ROLE-02): the reviewer never holds the maker's permissions. */
export const MAKER_PERMISSIONS: readonly Permission[] = ['upload:create', 'mapping:propose'];
