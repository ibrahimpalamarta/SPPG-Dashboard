import { z } from 'zod';
import { ROLES } from '../auth/roles.js';

/**
 * Single place where process.env is read. Everything else imports `env`.
 * Fails fast at boot with a readable list of what is missing — never with a
 * value dumped into the message.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8080),

  // Prisma reads DATABASE_URL. In ECS only the discrete DB_* pieces are
  // injected (see infra/modules/compute), so we compose the URL below.
  DATABASE_URL: z.string().min(1).optional(),
  DB_HOST: z.string().optional(),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_NAME: z.string().optional(),
  DB_USERNAME: z.string().optional(),
  DB_PASSWORD: z.string().optional(),

  // Read-only credentials for /api/public/*. A separate Postgres role that can
  // SELECT the two public views and nothing else, so SCRUM-13 is enforced by
  // the database rather than by the application remembering to filter.
  // Required in production; falls back to the main client elsewhere so a fresh
  // clone still runs without provisioning a second role first.
  DATABASE_URL_PUBLIC: z.string().min(1).optional(),
  // Staging-only opt-out of the production check below, until the sppg_public
  // role is provisioned there. Never set in the production environment.
  ALLOW_SHARED_PUBLIC_DB: z.enum(['true']).optional(),

  // S3 assets bucket (Terraform output `bucket_name`). Credentials come from
  // the ECS task role — the app configures nothing beyond bucket and region.
  S3_BUCKET: z.string().min(1),
  AWS_REGION: z.string().min(1).default('ap-southeast-3'),

  /** Upload ceiling. A menu workbook is a few hundred KB; 10 MB is slack, not a
   * target, and it is what stops an upload from becoming a memory lever. */
  UPLOAD_MAX_BYTES: z.coerce.number().int().positive().default(10 * 1024 * 1024),

  // Sessions (auth/session.ts). The idle timeout slides with use; the absolute
  // cap does not, so a stolen cookie cannot be kept alive forever.
  SESSION_IDLE_MINUTES: z.coerce.number().int().positive().default(8 * 60),
  SESSION_ABSOLUTE_HOURS: z.coerce.number().int().positive().default(7 * 24),

  // Proxy hops in front of this API whose X-Forwarded-For is trusted. 1 = the
  // ALB. The admin frontend relays logins and forwards the real client address,
  // so when it reaches this API through the ALB too (client -> ALB -> frontend
  // -> ALB -> API) set 2; otherwise every user shares the frontend's address
  // and one person can exhaust the per-IP login limit for everyone.
  TRUST_PROXY_HOPS: z.coerce.number().int().min(1).max(5).default(1),

  // Brute-force protection: per-account lockout plus a per-IP limiter on the
  // unauthenticated /api/auth routes.
  LOGIN_MAX_FAILURES: z.coerce.number().int().positive().default(5),
  LOGIN_LOCK_MINUTES: z.coerce.number().int().positive().default(15),
  AUTH_ENDPOINT_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60_000),
  AUTH_ENDPOINT_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),

  // Lifetime of a set/reset-password link.
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().positive().default(60),
  // Self-service "forgot password": the verified SES sender and the public URL
  // of the admin frontend (including its /admin base path) the emailed link
  // points at. Either unset = the endpoint still answers but sends nothing.
  EMAIL_FROM: z.string().min(1).optional(),
  ADMIN_BASE_URL: z.string().url().optional(),
  // SCRUM-121: lifetime of an invitation (set-password link of a new account).
  INVITE_TTL_HOURS: z.coerce.number().int().positive().default(72),

  // 32 random bytes, base64 (`openssl rand -base64 32`). Encrypts TOTP secrets
  // at rest and signs the short-lived MFA challenge token. Rotating it
  // invalidates every enrolled authenticator.
  MFA_ENCRYPTION_KEY: z
    .string()
    .min(1)
    .refine((v) => Buffer.from(v, 'base64').length === 32, {
      message: 'must be 32 bytes, base64-encoded',
    }),
  // Roles that cannot get a session without MFA (comma-separated Role names).
  MFA_REQUIRED_ROLES: z
    .string()
    .default('')
    .transform((v) =>
      v
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.enum(ROLES))),

  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60_000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),

  // The public dashboard is unauthenticated, so its limiter is separate: no
  // session lookup and no write behind it, but also no caller identity to
  // attribute abuse to.
  PUBLIC_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  PUBLIC_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),

  // Comma-separated browser origins allowed to call this API cross-origin.
  // Empty (the default) sends no CORS headers at all — see middleware/cors.ts.
  CORS_ORIGINS: z
    .string()
    .default('')
    .transform((v) =>
      v
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
    ),
});

/**
 * `KEY=` in a .env file (and an unset ECS parameter) arrives as `""`, which is
 * not the same as absent to zod: `.optional()` would reject it and `.default()`
 * would not fire. Treat blank as unset so a commented-out-looking line behaves
 * like one.
 */
export const withoutBlanks = (source: NodeJS.ProcessEnv): NodeJS.ProcessEnv =>
  Object.fromEntries(Object.entries(source).filter(([, v]) => v !== ''));

const parsed = schema.safeParse(withoutBlanks(process.env));
if (!parsed.success) {
  const missing = Object.keys(parsed.error.flatten().fieldErrors).join(', ');
  throw new Error(`Invalid environment configuration. Check: ${missing}`);
}

export const env = parsed.data;

if (!env.DATABASE_URL) {
  const { DB_HOST, DB_PORT, DB_NAME, DB_USERNAME, DB_PASSWORD } = env;
  if (DB_HOST && DB_NAME && DB_USERNAME && DB_PASSWORD) {
    const auth = `${encodeURIComponent(DB_USERNAME)}:${encodeURIComponent(DB_PASSWORD)}`;
    // sslmode=require: RDS is reachable only inside the VPC, but the hop is
    // still encrypted.
    process.env.DATABASE_URL = `postgresql://${auth}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=require`;
  } else if (env.NODE_ENV !== 'test') {
    throw new Error('Set DATABASE_URL, or DB_HOST/DB_NAME/DB_USERNAME/DB_PASSWORD.');
  }
}

// The whole point of the restricted role is that production cannot serve the
// public dashboard through a connection that is able to read menu_costs. A
// missing URL there is a silent downgrade, so refuse to boot instead.
if (env.NODE_ENV === 'production' && !env.DATABASE_URL_PUBLIC && !env.ALLOW_SHARED_PUBLIC_DB) {
  throw new Error(
    'Set DATABASE_URL_PUBLIC (role sppg_public). See scripts/grant-public-role.ts.',
  );
}
