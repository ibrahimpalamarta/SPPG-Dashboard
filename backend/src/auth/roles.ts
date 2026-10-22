export const ROLES = ['SUPER_ADMIN', 'DATA_ADMIN', 'CMS_ADMIN', 'INTERNAL', 'PUBLIC'] as const;
export type Role = (typeof ROLES)[number];

/**
 * Auth0 role names -> DB enum. Create the roles in Auth0 with exactly these
 * names (see README); anything else is ignored rather than trusted.
 */
export const AUTH0_ROLE_NAMES: Record<string, Role> = {
  super_admin: 'SUPER_ADMIN',
  data_admin: 'DATA_ADMIN',
  cms_admin: 'CMS_ADMIN',
  internal: 'INTERNAL',
  public: 'PUBLIC',
};

export const PERMISSIONS = [
  'upload:create',
  'upload:view',
  'batch:review',
  'batch:publish',
  'mapping:view',
  'mapping:propose',
  'reference:view',
  'reference:edit',
  'member:invite',
  'dashboard:view',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

/**
 * SCRUM-20. Routes check a permission, not a role, so adding one of the PRD's
 * other roles is one enum value plus one entry here.
 *
 *   SUPER_ADMIN = Project Manager MBG (semua dapur, undang anggota, publish,
 *                 ubah Data Reference)
 *   DATA_ADMIN  = Data Admin / PIC dapur (upload untuk dapurnya sendiri)
 *
 * CMS_ADMIN and PUBLIC hold none: the CMS routes still gate on requireRole.
 */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  SUPER_ADMIN: PERMISSIONS,
  // mapping:propose: whoever uploads can suggest a column mapping for a file
  // the registry did not recognise (SCRUM-124); only PM approves it.
  DATA_ADMIN: ['upload:create', 'upload:view', 'mapping:view', 'mapping:propose', 'reference:view', 'dashboard:view'],
  INTERNAL: ['upload:view', 'mapping:view', 'reference:view', 'dashboard:view'],
  CMS_ADMIN: [],
  PUBLIC: [],
};

export const hasPermission = (role: Role, perm: Permission): boolean =>
  ROLE_PERMISSIONS[role].includes(perm);

/**
 * Only used to collapse multiple role claims down to one, so it needs a total
 * order even where the roles are not really comparable.
 *
 * TODO(catatan): CMS_ADMIN (kelola konten publik, SCRUM-14) dan DATA_ADMIN
 * (entri data operasional) sebetulnya dua sumbu berbeda, bukan tingkatan.
 * CMS_ADMIN ditaruh di bawah DATA_ADMIN supaya urutannya pasti — konfirmasi ke
 * tim mana yang menang kalau satu akun memegang kedua klaim sekaligus.
 */
const RANK: Record<Role, number> = {
  PUBLIC: 0,
  INTERNAL: 1,
  CMS_ADMIN: 2,
  DATA_ADMIN: 3,
  SUPER_ADMIN: 4,
};

/**
 * Reduce the roles claim to the single effective role.
 * Unknown or malformed claims fall back to the least privileged role — never
 * to a permissive default.
 */
export function roleFromClaims(claims: unknown): Role {
  if (!Array.isArray(claims)) return 'PUBLIC';
  return claims
    .filter((c): c is string => typeof c === 'string')
    .map((c) => AUTH0_ROLE_NAMES[c])
    .filter((r): r is Role => r !== undefined)
    .reduce<Role>((best, r) => (RANK[r] > RANK[best] ? r : best), 'PUBLIC');
}
