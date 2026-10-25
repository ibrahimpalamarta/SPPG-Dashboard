import type { Db } from '../db.js';
import { permissionsFor } from './rbac-store.js';
import type { Role } from './roles.js';
import type { AppUser } from './user.js';

/**
 * May `actor` act on an account that holds `targetRole`? (create, edit, reset,
 * revoke). A non-Super Admin may only touch roles whose permissions it holds
 * itself, and never a Super Admin — otherwise `users:manage` would be a
 * one-step route to full admin.
 */
export async function mayManageRole(actor: AppUser, targetRole: Role, db: Db): Promise<boolean> {
  if (actor.role === 'SUPER_ADMIN') return true;
  if (targetRole === 'SUPER_ADMIN') return false;
  const target = await permissionsFor(targetRole, db);
  return target.every((p) => actor.permissions.includes(p));
}
