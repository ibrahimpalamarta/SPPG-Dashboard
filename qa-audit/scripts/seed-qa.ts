/**
 * QA accounts, one per role (decision QD-03 in docs/decision-log.md).
 * Change the mapping here only.
 *
 * Passwords: QA_SEED_PASSWORD when set, otherwise random per run. They are
 * written to .auth/accounts.json for the Playwright setup project; that folder
 * is gitignored and never uploaded.
 */
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { hashPassword } from '../../backend/src/auth/password.js';
import { KITCHEN_SCOPED_ROLES, type Role } from '../../backend/src/auth/roles.js';
import { issueResetToken } from '../../backend/src/auth/reset.js';
import { env } from '../../backend/src/config/env.js';
import { prisma } from '../../backend/src/db.js';
import { AUTH, writeJson } from './lib.js';

type Account = { key: string; fullName: string; role: Role; kitchens: 'all' | string[] };

const ACCOUNTS: Account[] = [
  { key: 'admin', fullName: 'QA Admin', role: 'ADMIN', kitchens: 'all' },
  { key: 'data-operasional-skn', fullName: 'QA Data Operasional SKN', role: 'DATA_ADMIN', kitchens: ['SKN'] },
  // Second dapur: the other side of every kitchen-isolation check (tests/e2e/isolasi.spec.ts).
  { key: 'data-operasional-lwg', fullName: 'QA Data Operasional LWG', role: 'DATA_ADMIN', kitchens: ['LWG'] },
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
  // "All kitchens" is no scope rows for Admin, but every row for a kitchen-scoped role, which
  // sees nothing without them (backend/src/auth/guard.ts resolveKitchenIds).
  const scoped =
    a.kitchens === 'all'
      ? KITCHEN_SCOPED_ROLES.includes(a.role) ? kitchens : []
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
  create: { email: 'qa.reset@qa-audit.test', fullName: 'QA Reset', role: 'ADMIN', passwordHash },
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

// Inbox and header bell (SCRUM-152): the tasks a kitchen would really have waiting. A Cashflow file from SKN and a Menu
// file from LWG whose columns were not recognised (Data Operasional sees only its own dapur's), and an invitation
// nobody accepted in time (Admin only). Without these the Inbox is the empty state for every role.
const uploaders = await prisma.user.findMany({ where: { email: { in: ['qa.data-operasional-skn@qa-audit.test', 'qa.data-operasional-lwg@qa-audit.test'] } }, select: { id: true, email: true } });
const notRecognised = (missing: string) => `Format file belum dikenali untuk kitchen/source ini. File belum dipublish. Kolom tidak ditemukan: ${missing}.`;
for (const f of [
  { kitchen: 'SKN', as: 'qa.data-operasional-skn@qa-audit.test', domain: 'CASHFLOW', fileName: 'Cashflow_Sukun_Minggu2_Nov2026.xlsx', missing: 'txn_id, tanggal, harga_satuan' },
  { kitchen: 'LWG', as: 'qa.data-operasional-lwg@qa-audit.test', domain: 'MENU', fileName: 'Menu_Lawang_Nov2026.xlsx', missing: 'Menu Type, Porsi' },
] as const) {
  const kitchen = kitchens.find((k) => k.code === f.kitchen);
  const uploader = uploaders.find((u) => u.email === f.as);
  if (!kitchen || !uploader) throw new Error(`cannot seed inbox file for ${f.kitchen}`);
  await prisma.uploadBatch.create({
    data: {
      kitchenId: kitchen.id,
      uploaderId: uploader.id,
      domain: f.domain,
      fileName: f.fileName,
      fileHash: randomBytes(32).toString('hex'),
      fileSize: 48_213,
      rowCount: 0,
      status: 'NEEDS_MAPPING_UPDATE',
      errorCode: 'PROFILE_NOT_DETECTED',
      errorSummary: notRecognised(f.missing),
    },
  });
}
const lapsed = await prisma.user.upsert({
  where: { email: 'qa.undangan-lewat@qa-audit.test' },
  create: { email: 'qa.undangan-lewat@qa-audit.test', fullName: 'Siti Rahmawati', role: 'DATA_ADMIN' },
  update: { passwordHash: null },
});
await issueResetToken(lapsed.id, prisma, -60);

writeJson(join(AUTH, 'accounts.json'), credentials);
console.log(`seeded ${ACCOUNTS.length} QA accounts`);
await prisma.$disconnect();
