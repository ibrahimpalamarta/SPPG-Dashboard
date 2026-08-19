import { z } from 'zod';

/**
 * Single place where process.env is read. Everything else imports `env`.
 * Fails fast at boot with a readable list of what is missing — never with a
 * value dumped into the message.
 */
/**
 * Bare tenant host. Accepts what people actually paste — a full issuer URL, or
 * the Management API audience `https://tenant/api/v2/` — because every consumer
 * builds its own `https://${domain}/...` and a scheme here doubles it up.
 */
export const auth0Domain = z
  .string()
  .min(1)
  .transform((v) => v.replace(/^https?:\/\//, '').replace(/\/.*$/, ''))
  .pipe(z.string().min(1));

const CHAR_CLASSES = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/];

/**
 * Auth0's default database-connection policy ("Good"): at least 3 of lowercase
 * / uppercase / digit / symbol. Length on its own does not satisfy it —
 * `supersecret123oke` is 17 characters and still only two classes.
 *
 * Checked here so a weak password fails instantly with an actionable message,
 * instead of coming back as a Management API 400 that reads like a length
 * complaint.
 *
 * ponytail: mirrors the *default* policy. Auth0 stays the authority — if the
 * tenant's policy is tightened, this only catches the common case early.
 */
export const auth0Password = z
  .string()
  .min(12)
  .refine((v) => CHAR_CLASSES.filter((re) => re.test(v)).length >= 3, {
    message:
      'must mix at least 3 of: lowercase, uppercase, digits, symbols (Auth0 default policy). Leave it blank to have a strong one generated instead.',
  });

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

  // S3 assets bucket (Terraform output `bucket_name`). Credentials come from
  // the ECS task role — the app configures nothing beyond bucket and region.
  S3_BUCKET: z.string().min(1),
  AWS_REGION: z.string().min(1).default('ap-southeast-3'),

  /** Upload ceiling. A menu workbook is a few hundred KB; 10 MB is slack, not a
   * target, and it is what stops an upload from becoming a memory lever. */
  UPLOAD_MAX_BYTES: z.coerce.number().int().positive().default(10 * 1024 * 1024),

  // Auth0 — none of these are secrets: the API only ever verifies tokens.
  // The Management API credentials live in the seed script's own env, not here.
  AUTH0_DOMAIN: auth0Domain,
  AUTH0_AUDIENCE: z.string().min(1),
  AUTH0_ROLES_CLAIM: z.string().min(1),

  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60_000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),

  // The public dashboard is unauthenticated, so its limiter is separate: no
  // token verification and no find-or-create write behind it, but also no
  // caller identity to attribute abuse to.
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

/** Auth0 issuer. Always https — Auth0 does not serve tokens over anything else. */
export const AUTH0_ISSUER = `https://${env.AUTH0_DOMAIN}/`;
