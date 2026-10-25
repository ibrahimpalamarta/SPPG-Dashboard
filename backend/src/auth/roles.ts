export const ROLES = ['SUPER_ADMIN', 'DATA_ADMIN', 'CMS_ADMIN', 'INTERNAL', 'PUBLIC'] as const;
export type Role = (typeof ROLES)[number];

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
 * SUPER_ADMIN (Project Manager MBG) always holds all of them and is not stored
 * in the table. CMS_ADMIN and PUBLIC hold none by default: CMS routes still
 * gate on requireRole.
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
