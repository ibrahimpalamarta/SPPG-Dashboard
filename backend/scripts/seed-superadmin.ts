/**
 * Creates (or repairs) one Super Admin account in Postgres. Idempotent.
 *
 *   npm run seed:superadmin
 *
 * Required env (see .env.example): SEED_SUPERADMIN_EMAIL, and optionally
 * SEED_SUPERADMIN_PASSWORD. With no password a set-password token is printed
 * once instead — open `/admin/reset-password/<token>` to choose one. That is
 * the safer route for a first production account: no password ever passes
 * through a shell history or a CI log.
 *
 * Re-running on an existing account promotes it to SUPER_ADMIN, re-enables it,
 * and — only if you passed a password — resets the password and ends its
 * sessions. It never touches the MFA settings.
 *
 * Refuses to run against NODE_ENV=production without --force.
 */
import { z } from 'zod';
import { prisma } from '../src/db.js';
import { withoutBlanks } from '../src/config/env.js';
import { passwordPolicy, hashPassword } from '../src/auth/password.js';
import { issueResetToken } from '../src/auth/reset.js';
import { revokeUserSessions } from '../src/auth/session.js';
import { writeAuditLog } from '../src/auth/audit.js';

const cfg = z
  .object({
    NODE_ENV: z.string().default('development'),
    SEED_SUPERADMIN_EMAIL: z.string().trim().toLowerCase().email(),
    // Blank means "send me a link instead" — withoutBlanks turns `KEY=` into absent.
    SEED_SUPERADMIN_PASSWORD: passwordPolicy.optional(),
  })
  .parse(withoutBlanks(process.env));

const force = process.argv.includes('--force');

async function main(): Promise<void> {
  if (cfg.NODE_ENV === 'production' && !force) {
    throw new Error('Refusing to seed a Super Admin with NODE_ENV=production. Pass --force if you mean it.');
  }

  const passwordHash = cfg.SEED_SUPERADMIN_PASSWORD ? await hashPassword(cfg.SEED_SUPERADMIN_PASSWORD) : undefined;
  const existing = await prisma.user.findUnique({ where: { email: cfg.SEED_SUPERADMIN_EMAIL } });

  const user = await prisma.user.upsert({
    where: { email: cfg.SEED_SUPERADMIN_EMAIL },
    create: { email: cfg.SEED_SUPERADMIN_EMAIL, fullName: 'Super Admin', role: 'SUPER_ADMIN', passwordHash },
    update: { role: 'SUPER_ADMIN', status: 'ACTIVE', failedLoginCount: 0, lockedUntil: null, ...(passwordHash && { passwordHash }) },
  });
  if (existing && passwordHash) await revokeUserSessions(user.id, prisma);

  await writeAuditLog(prisma, {
    userId: user.id,
    action: existing ? 'seed.superadmin_updated' : 'seed.superadmin_created',
    entity: 'users',
    entityId: user.id,
  });

  console.log(`${existing ? 'Updated' : 'Created'} Super Admin ${user.email} (id ${user.id}).`);
  if (!passwordHash) {
    const { token, expiresAt } = await issueResetToken(user.id, prisma);
    console.log(`Set-password link (shown once, valid until ${expiresAt.toISOString()}):`);
    console.log(`  /admin/reset-password/${token}`);
  }
}

main()
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
