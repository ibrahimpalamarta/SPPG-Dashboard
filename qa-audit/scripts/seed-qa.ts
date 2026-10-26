/**
 * QA accounts, one per PRD role, mapped onto the roles the code has today
 * (decision QD-03 in docs/decision-log.md). Change the mapping here only.
 *
 * Passwords: QA_SEED_PASSWORD when set, otherwise random per run. They are
 * written to .auth/accounts.json for the Playwright setup project; that folder
 * is gitignored and never uploaded.
 */
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { hashPassword } from '../../backend/src/auth/password.js';
import { issueResetToken } from '../../backend/src/auth/reset.js';
import { env } from '../../backend/src/config/env.js';
import { prisma } from '../../backend/src/db.js';
import { AUTH, writeJson } from './lib.js';

type Account = { key: string; fullName: string; role: 'INTERNAL' | 'DATA_ADMIN'; kitchens: 'all' | string[] };

const ACCOUNTS: Account[] = [
  { key: 'management', fullName: 'QA Management', role: 'INTERNAL', kitchens: 'all' },
  { key: 'finance', fullName: 'QA Finance', role: 'INTERNAL', kitchens: 'all' },
  { key: 'kepala-kitchen-skn', fullName: 'QA Kepala Kitchen SKN', role: 'INTERNAL', kitchens: ['SKN'] },
  { key: 'data-steward', fullName: 'QA Data Steward', role: 'DATA_ADMIN', kitchens: 'all' },
];

// Same statement as backend/scripts/grant-public-role.ts, which cannot run as-is:
// its grants report selects information_schema.table_name (sql_identifier) and
// Prisma cannot deserialize it. Back to the script once that is fixed (docs/roadmap.md).
const publicPassword = process.env.PUBLIC_DB_PASSWORD;
if (!publicPassword) throw new Error('PUBLIC_DB_PASSWORD unset');
const [grant] = await prisma.$queryRaw<{ sql: string }[]>`
  SELECT format('ALTER ROLE %I WITH LOGIN PASSWORD %L', 'sppg_public'::text, ${publicPassword}::text) AS sql`;
await prisma.$executeRawUnsafe(grant!.sql);

const password = process.env.QA_SEED_PASSWORD || `Qa9-${randomBytes(12).toString('base64url')}`;
const passwordHash = await hashPassword(password);
const kitchens = await prisma.kitchen.findMany({ select: { id: true, code: true } });
const credentials: Record<string, { email: string; password: string }> = {};

for (const a of ACCOUNTS) {
  const email = `qa.${a.key}@qa-audit.test`;
  const user = await prisma.user.upsert({
    where: { email },
    create: { email, fullName: a.fullName, role: a.role, passwordHash },
    update: { fullName: a.fullName, role: a.role, passwordHash, status: 'ACTIVE', failedLoginCount: 0, lockedUntil: null },
  });
  // "All kitchens" is no scope rows for INTERNAL, but every row for DATA_ADMIN,
  // which sees nothing without them (backend/src/auth/guard.ts resolveKitchenIds).
  const scoped =
    a.kitchens === 'all'
      ? a.role === 'DATA_ADMIN' ? kitchens : []
      : kitchens.filter((k) => k.code && a.kitchens.includes(k.code));
  if (a.kitchens !== 'all' && scoped.length !== a.kitchens.length) throw new Error(`kitchen code missing for ${a.key}`);
  await prisma.userKitchenScope.deleteMany({ where: { userId: user.id } });
  await prisma.userKitchenScope.createMany({ data: scoped.map((k) => ({ userId: user.id, kitchenId: k.id })) });
  credentials[a.key] = { email, password };
}

// Single-use links for the account flows (tests/e2e/akun.spec.ts). The emailed link cannot be
// read in QA (no SES), so the token is minted here, the same way the backend does it.
const reset = await prisma.user.upsert({
  where: { email: 'qa.reset@qa-audit.test' },
  create: { email: 'qa.reset@qa-audit.test', fullName: 'QA Reset', role: 'INTERNAL', passwordHash },
  update: { passwordHash },
});
const invited = await prisma.user.upsert({
  where: { email: 'qa.undangan@qa-audit.test' },
  create: { email: 'qa.undangan@qa-audit.test', fullName: 'QA Anggota Baru', role: 'DATA_ADMIN' },
  update: { passwordHash: null },
});
writeJson(join(AUTH, 'tokens.json'), {
  reset: { email: reset.email, token: (await issueResetToken(reset.id, prisma)).token },
  invite: { email: invited.email, token: (await issueResetToken(invited.id, prisma, env.INVITE_TTL_HOURS * 60)).token },
});

writeJson(join(AUTH, 'accounts.json'), credentials);
console.log(`seeded ${ACCOUNTS.length} QA accounts`);
await prisma.$disconnect();
