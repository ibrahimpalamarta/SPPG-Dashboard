import type { Prisma } from '@prisma/client';
import { prisma, type Db } from '../db.js';
import { roleFromClaims } from './roles.js';
import { writeAuditLog } from './audit.js';
import type { AuthContext } from './jwt.js';

export const withKitchenScopes = {
  kitchenScopes: { select: { kitchenId: true } },
} satisfies Prisma.UserInclude;

/** `req.user`: the user row plus the dapur it may touch (SCRUM-20). */
export type AppUser = Prisma.UserGetPayload<{ include: typeof withKitchenScopes }>;

/**
 * Find-or-create the Postgres row backing an Auth0 identity.
 *
 * SCRUM-20: Postgres owns the role. The Auth0 claim only seeds it the first
 * time an identity is seen; after that a role or kitchen scope is changed
 * through the admin API (and audited there), so an invited member keeps the
 * role the invitation gave them. Revoking access is therefore an admin-API
 * action, not an Auth0 one.
 *
 * Steady state costs one indexed read and no write.
 */
export async function findOrCreateUser(auth: AuthContext, db: Db = prisma): Promise<AppUser> {
  const email = auth.email?.toLowerCase();
  const fullName = auth.name;

  const existing = await db.user.findUnique({
    where: { auth0Sub: auth.sub },
    include: withKitchenScopes,
  });
  if (existing && existing.email === (email ?? null)) {
    return existing;
  }

  // upsert, not create: two concurrent first requests would otherwise race on
  // the auth0_sub unique index.
  const role = roleFromClaims(auth.roleClaims);
  const user = await db.user.upsert({
    where: { auth0Sub: auth.sub },
    create: { auth0Sub: auth.sub, email, fullName, role },
    update: { email, fullName },
    include: withKitchenScopes,
  });

  if (!existing) {
    await writeAuditLog(db, {
      userId: user.id,
      action: 'user.provisioned',
      entity: 'user',
      entityId: user.id,
      metadata: { role },
    });
  }

  return user;
}
