/**
 * Creates (or repairs) one Super Admin account: Auth0 user -> role assignment
 * -> Postgres row. Idempotent; safe to re-run.
 *
 *   npm run seed:superadmin
 *
 * Required env (see .env.example):
 *   AUTH0_DOMAIN, AUTH0_M2M_CLIENT_ID, AUTH0_M2M_CLIENT_SECRET,
 *   SEED_SUPERADMIN_EMAIL, and optionally SEED_SUPERADMIN_PASSWORD.
 *
 * Refuses to run against NODE_ENV=production without --force.
 */
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../src/db.js';
import { auth0Domain, auth0Password, withoutBlanks } from '../src/config/env.js';
import { writeAuditLog } from '../src/auth/audit.js';

const cfg = z
  .object({
    NODE_ENV: z.string().default('development'),
    AUTH0_DOMAIN: auth0Domain,
    AUTH0_M2M_CLIENT_ID: z.string().min(1),
    AUTH0_M2M_CLIENT_SECRET: z.string().min(1),
    AUTH0_CONNECTION: z.string().default('Username-Password-Authentication'),
    SEED_SUPERADMIN_EMAIL: z.string().email(),
    // Blank means "generate one" — withoutBlanks turns `KEY=` into absent.
    SEED_SUPERADMIN_PASSWORD: auth0Password.optional(),
  })
  .parse(withoutBlanks(process.env));

const SUPER_ADMIN_ROLE_NAME = 'super_admin';
const force = process.argv.includes('--force');

/**
 * base64url of 24 random bytes = 192 bits. The trailing characters guarantee
 * the mixed-case/digit/symbol mix Auth0's default password policy wants.
 */
const generatePassword = () => `${randomBytes(24).toString('base64url')}aA1!`;

// ---------------------------------------------------------------------------
// Auth0 Management API. Plain fetch — https only, enforced by the URL below.
// ---------------------------------------------------------------------------

const base = `https://${cfg.AUTH0_DOMAIN}`;

/**
 * Auth0 error bodies carry `error_description` (token endpoint) or `message`
 * (Management API), and neither ever echoes the credentials we sent. Surface
 * exactly those fields — never the raw body, which on a failed user-create can
 * contain the payload we posted.
 */
async function describeFailure(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as Record<string, unknown>;
    const detail = body.error_description ?? body.message ?? body.error;
    return typeof detail === 'string' ? `${res.status} — ${detail}` : `${res.status}`;
  } catch {
    return `${res.status}`;
  }
}

async function getManagementToken(): Promise<string> {
  const res = await fetch(`${base}/oauth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: cfg.AUTH0_M2M_CLIENT_ID,
      client_secret: cfg.AUTH0_M2M_CLIENT_SECRET,
      audience: `${base}/api/v2/`,
    }),
  });
  if (!res.ok) {
    throw new Error(
      `Auth0 token request failed (${await describeFailure(res)})\n` +
        `  Audience requested: ${base}/api/v2/\n` +
        `  A 403 here almost always means the M2M application "${cfg.AUTH0_M2M_CLIENT_ID}"\n` +
        `  has no grant for the Management API. In Auth0: Applications > APIs >\n` +
        `  Auth0 Management API > Machine to Machine Applications > authorise this\n` +
        `  app with scopes: read:users create:users read:roles create:role_members`,
    );
  }
  const body = (await res.json()) as { access_token?: string };
  if (!body.access_token) throw new Error('Auth0 token response had no access_token');
  return body.access_token;
}

async function mgmt<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${base}/api/v2${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...init.headers },
  });
  if (!res.ok) {
    const hint =
      res.status === 403 ? ' — the M2M app is missing a scope for this call (see README)' : '';
    throw new Error(`Auth0 ${init.method ?? 'GET'} ${path} failed (${await describeFailure(res)})${hint}`);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

interface Auth0User {
  user_id: string;
  email: string;
  name?: string;
}

async function findOrCreateAuth0User(token: string, password: string) {
  const found = await mgmt<Auth0User[]>(
    token,
    `/users-by-email?email=${encodeURIComponent(cfg.SEED_SUPERADMIN_EMAIL)}`,
  );
  if (found.length > 0) return { user: found[0]!, created: false };

  const user = await mgmt<Auth0User>(token, '/users', {
    method: 'POST',
    body: JSON.stringify({
      connection: cfg.AUTH0_CONNECTION,
      email: cfg.SEED_SUPERADMIN_EMAIL,
      password,
      email_verified: true,
      name: 'Super Admin',
    }),
  });
  return { user, created: true };
}

async function assignSuperAdminRole(token: string, userId: string) {
  const roles = await mgmt<{ id: string; name: string }[]>(
    token,
    `/roles?name_filter=${encodeURIComponent(SUPER_ADMIN_ROLE_NAME)}`,
  );
  const role = roles.find((r) => r.name === SUPER_ADMIN_ROLE_NAME);
  if (!role) {
    throw new Error(`Role "${SUPER_ADMIN_ROLE_NAME}" not found in Auth0. Create it first (see README).`);
  }
  // Auth0 treats re-assigning an existing role as a no-op, so this stays idempotent.
  await mgmt(token, `/users/${encodeURIComponent(userId)}/roles`, {
    method: 'POST',
    body: JSON.stringify({ roles: [role.id] }),
  });
}

// ---------------------------------------------------------------------------

async function main() {
  if (cfg.NODE_ENV === 'production' && !force) {
    console.error('Refusing to seed a test account in production. Re-run with --force if you truly mean it.');
    process.exit(1);
  }

  const password = cfg.SEED_SUPERADMIN_PASSWORD ?? generatePassword();
  const generated = !cfg.SEED_SUPERADMIN_PASSWORD;

  const token = await getManagementToken();
  const { user, created } = await findOrCreateAuth0User(token, password);
  await assignSuperAdminRole(token, user.user_id);

  const row = await prisma.user.upsert({
    where: { auth0Sub: user.user_id },
    create: {
      auth0Sub: user.user_id,
      email: cfg.SEED_SUPERADMIN_EMAIL.toLowerCase(),
      fullName: user.name ?? 'Super Admin',
      role: 'SUPER_ADMIN',
    },
    update: { role: 'SUPER_ADMIN' },
  });

  await writeAuditLog(prisma, {
    userId: row.id,
    action: created ? 'seed.superadmin_created' : 'seed.superadmin_verified',
    entity: 'user',
    entityId: row.id,
  });

  console.log(`Super Admin ${created ? 'created' : 'already existed'}: ${cfg.SEED_SUPERADMIN_EMAIL}`);
  console.log(`  auth0 sub: ${user.user_id}`);
  console.log(`  db id:     ${row.id}`);
  console.log('  role:      SUPER_ADMIN');

  if (created && generated) {
    // Printed once, to stdout, and nowhere else. Not logged, not stored.
    console.log('\n  Generated password (shown once — copy it now):\n');
    console.log(`      ${password}\n`);
    console.log('  Change it after first login. It is not recoverable from here.');
  } else if (!created && generated) {
    console.log('\n  Existing account left untouched; no password was set or printed.');
  }
}

main()
  .catch((err) => {
    console.error(`Seed failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
