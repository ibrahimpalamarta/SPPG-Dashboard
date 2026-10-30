import type { Db } from '../db.js';
import { MAKER_PERMISSIONS, PERMISSIONS, type Permission, type Role } from './roles.js';

const TTL_MS = 30_000;
const cache = new Map<Role, { permissions: readonly Permission[]; at: number }>();

const ADMIN_PERMISSIONS = PERMISSIONS.filter((p) => !MAKER_PERMISSIONS.includes(p));

const known =(p: string): p is Permission => (PERMISSIONS as readonly string[]).includes(p);

/**
 * What `role` may do right now. Cached per process for a few seconds because
 * every authenticated request asks.
 *
 * ponytail: with several ECS tasks a permission edit reaches the others within
 * TTL_MS, not instantly. Per-request reads (or pg NOTIFY) if that is too slow.
 */
export async function permissionsFor(role: Role, db: Db, now = Date.now()): Promise<readonly Permission[]> {
  // Never read from the table: the one role that must not be lockable-out.
  if (role === 'ADMIN') return ADMIN_PERMISSIONS;

  const hit = cache.get(role);
  if (hit && now - hit.at < TTL_MS) return hit.permissions;

  const rows = await db.rolePermission.findMany({ where: { role }, select: { permission: true } });
  const permissions = rows.map((r) => r.permission).filter(known);
  cache.set(role, { permissions, at: now });
  return permissions;
}

/** Replaces the whole set. Caller has already checked the actor may grant each one. */
export async function setRolePermissions(role: Role, permissions: readonly Permission[], db: Db): Promise<void> {
  await db.$transaction([
    db.rolePermission.deleteMany({ where: { role } }),
    db.rolePermission.createMany({ data: permissions.map((permission) => ({ role, permission })) }),
  ]);
  cache.delete(role);
}

export const clearPermissionCache = (): void => cache.clear();
