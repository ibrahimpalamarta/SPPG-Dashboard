/**
 * Gives the `sppg_public` role (created by the 20260819000000 migration) a
 * password and LOGIN, then prints the connection string to store as
 * DATABASE_URL_PUBLIC.
 *
 *   PUBLIC_DB_PASSWORD=... npm run grant:public-role
 *
 * Run once per environment, after `prisma migrate deploy`. Idempotent — running
 * it again just rotates the password. Kept out of the migration on purpose: a
 * committed .sql file is the wrong place for a credential.
 */
import { prisma } from '../src/db.js';
import { env } from '../src/config/env.js';

const ROLE = 'sppg_public';
const password = process.env.PUBLIC_DB_PASSWORD;

if (!password || password.length < 16) {
  console.error('Set PUBLIC_DB_PASSWORD (16+ characters).');
  process.exit(1);
}

const exists = await prisma.$queryRaw<{ ok: boolean }[]>`
  SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = ${ROLE}) AS ok`;

if (!exists[0]?.ok) {
  console.error(`Role ${ROLE} does not exist. Run "npm run migrate:deploy" first.`);
  process.exit(1);
}

// Role name and password cannot be bound as query parameters in DDL, and
// hand-rolling the quoting is how injection bugs get written. `format` with
// %I/%L is Postgres doing its own escaping, which is the only version worth
// trusting.
const [statement] = await prisma.$queryRaw<{ sql: string }[]>`
  SELECT format('ALTER ROLE %I WITH LOGIN PASSWORD %L', ${ROLE}::text, ${password}::text) AS sql`;

await prisma.$executeRawUnsafe(statement!.sql);

const [grants] = await prisma.$queryRaw<{ tables: string[] }[]>`
  SELECT coalesce(array_agg(table_name ORDER BY table_name), '{}') AS tables
  FROM information_schema.role_table_grants
  WHERE grantee = ${ROLE} AND privilege_type = 'SELECT'`;

console.log(`${ROLE}: LOGIN enabled, password set.`);
console.log(`readable: ${grants?.tables.join(', ') || '(none — check the migration)'}`);
console.log(
  `\nDATABASE_URL_PUBLIC=postgresql://${ROLE}:<password>@${env.DB_HOST ?? 'localhost'}:${env.DB_PORT}/${env.DB_NAME ?? 'sppg_dashboard'}?sslmode=require`,
);

await prisma.$disconnect();
