/** SCRUM-152: two roles. ADMIN (formerly PM MBG) manages; DATA_ADMIN is Data Operasional, tied to one dapur. */
export const ROLES = ['ADMIN', 'DATA_ADMIN'] as const;
export type Role = (typeof ROLES)[number];

/** Roles whose scope is "dapur sendiri": no scope rows means no kitchens, never all. */
export const KITCHEN_SCOPED_ROLES: readonly Role[] = ['DATA_ADMIN'];

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
 * ADMIN always holds all of them except MAKER_PERMISSIONS and is not stored
 * in the table.
 */
export const PERMISSIONS = [
  'upload:create',
  'upload:view',
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

/** SCRUM-148: Admin neither uploads nor publishes files; Data Operasional does both for its own dapur. */
export const MAKER_PERMISSIONS: readonly Permission[] = ['upload:create', 'mapping:propose', 'batch:publish'];
