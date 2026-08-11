export const ROLES = ['SUPER_ADMIN', 'DATA_ADMIN', 'INTERNAL', 'PUBLIC'] as const;
export type Role = (typeof ROLES)[number];

/**
 * Auth0 role names -> DB enum. Create the roles in Auth0 with exactly these
 * names (see README); anything else is ignored rather than trusted.
 */
export const AUTH0_ROLE_NAMES: Record<string, Role> = {
  super_admin: 'SUPER_ADMIN',
  data_admin: 'DATA_ADMIN',
  internal: 'INTERNAL',
  public: 'PUBLIC',
};

const RANK: Record<Role, number> = { PUBLIC: 0, INTERNAL: 1, DATA_ADMIN: 2, SUPER_ADMIN: 3 };

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
