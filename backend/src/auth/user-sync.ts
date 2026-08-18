import type { User } from '@prisma/client';
import { prisma, type Db } from '../db.js';
import { roleFromClaims } from './roles.js';
import { writeAuditLog } from './audit.js';
import type { AuthContext } from './jwt.js';

/**
 * Find-or-create the Postgres row backing an Auth0 identity.
 *
 * Auth0 owns roles, so the claim is copied down on every login; the DB copy is
 * what authorization then reads. `scopeId` is never touched here — it is set by
 * a Super Admin, not by anything the caller can influence.
 *
 * Steady state costs one indexed read and no write.
 */
export async function findOrCreateUser(auth: AuthContext, db: Db = prisma): Promise<User> {
  const role = roleFromClaims(auth.roleClaims);
  const email = auth.email?.toLowerCase();
  const fullName = auth.name;

  const existing = await db.user.findUnique({ where: { auth0Sub: auth.sub } });
  if (existing && existing.role === role && existing.email === (email ?? null)) {
    return existing;
  }

  // upsert, not create: two concurrent first requests would otherwise race on
  // the auth0_sub unique index.
  const user = await db.user.upsert({
    where: { auth0Sub: auth.sub },
    create: { auth0Sub: auth.sub, email, fullName, role },
    update: { email, fullName, role },
  });

  if (!existing) {
    await writeAuditLog(db, {
      userId: user.id,
      action: 'user.provisioned',
      entity: 'user',
      entityId: user.id,
      metadata: { role },
    });
  } else if (existing.role !== role) {
    await writeAuditLog(db, {
      userId: user.id,
      action: 'user.role_synced',
      entity: 'user',
      entityId: user.id,
      metadata: { from: existing.role, to: role },
    });
  }

  return user;
}
