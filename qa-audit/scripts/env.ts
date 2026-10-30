/**
 * Stage 3: throwaway environment.
 *
 *   up     start `serve` detached, wait until backend and frontend-admin answer
 *   serve  own Postgres + migrate + seed + both servers for the life of the run
 *   down   stop whatever `up` started
 *
 * Postgres is embedded-postgres (16.14, same as RDS) unless QA_DATABASE_URL
 * points at one you already run locally. Nothing here can reach production:
 * every URL goes through the guard first.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';
import { assertSafeTarget } from './guard.js';
import { PORTS, QA, REPO, REPORTS, run, runAsync } from './lib.js';

const PID = join(REPORTS, 'env.pid');
const LOG = join(REPORTS, 'env.log');
const backend = join(REPO, 'backend');
const admin = join(REPO, 'frontend-admin');
const tsxCli = join(QA, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const backendUrl = `http://localhost:${PORTS.backend}`;
const adminUrl = `http://localhost:${PORTS.admin}/admin/login`;

const ok = async (url: string) => fetch(url).then((r) => r.ok, () => false);

async function up() {
  mkdirSync(REPORTS, { recursive: true });
  const log = openSync(LOG, 'w');
  const child = spawn(process.execPath, [tsxCli, join(QA, 'scripts', 'env.ts'), 'serve'], { cwd: QA, detached: true, stdio: ['ignore', log, log] });
  writeFileSync(PID, String(child.pid));
  let exited = false;
  child.on('exit', () => (exited = true));
  child.unref();

  const deadline = Date.now() + Number(process.env.QA_ENV_TIMEOUT_MS ?? 15 * 60_000);
  while (Date.now() < deadline && !exited) {
    if ((await ok(`${backendUrl}/health`)) && (await ok(adminUrl))) {
      console.log(`environment ready: ${backendUrl}, ${adminUrl}`);
      return;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  console.error(`environment not ready (${exited ? 'serve exited' : 'timeout'}). Tail of ${LOG}:`);
  console.error(readFileSync(LOG, 'utf8').split('\n').slice(-40).join('\n'));
  down();
  process.exit(1);
}

function step(name: string, r: ReturnType<typeof run>) {
  console.log(`--- ${name} (exit ${r.code})\n${r.out}`);
  if (r.code !== 0) throw new Error(`${name} failed`);
}

let pg: EmbeddedPostgres | undefined;

/** The backend only PUTs the original file to the assets bucket; this answers 200 and drops the body, so uploads work without AWS. */
const s3 = createServer((req, res) => {
  req.resume();
  req.on('end', () => res.writeHead(200, { ETag: '"qa"' }).end());
});

async function serve() {
  // Neither build needs the database, so they start first and overlap Postgres,
  // migrate and the seeds; everything is joined before a server starts.
  // tsc, not `npm run build`: its prebuild re-runs prisma generate, which stage 1
  // already did and which fails on Windows while a dev server holds the engine.
  const adminEnv = { NODE_ENV: 'production', API_BASE_URL: backendUrl };
  const builds = Promise.all(
    process.env.QA_SKIP_BUILD === '1'
      ? []
      : [
          runAsync('npx', ['tsc', '-p', 'tsconfig.json'], backend).then((r) => step('backend build', r)),
          runAsync('npx', ['next', 'build'], admin, adminEnv).then((r) => step('admin build', r)),
        ],
  );
  builds.catch(() => undefined); // surfaced where awaited below; an early failure must not crash as unhandled

  let dbUrl = process.env.QA_DATABASE_URL;
  if (dbUrl) {
    assertSafeTarget(dbUrl);
  } else {
    const dir = join(QA, '.pg');
    rmSync(dir, { recursive: true, force: true });
    pg = new EmbeddedPostgres({ databaseDir: dir, user: 'postgres', password: 'postgres', port: PORTS.db, persistent: false, initdbFlags: ['--encoding=UTF8', '--locale=C'] });
    await pg.initialise();
    await pg.start();
    await pg.createDatabase('sppg_qa');
    dbUrl = `postgresql://postgres:postgres@localhost:${PORTS.db}/sppg_qa`;
  }

  await new Promise<void>((r) => s3.listen(PORTS.s3, '127.0.0.1', r));

  // Generated per run: nothing to leak, nothing to rotate.
  const publicPassword = randomBytes(18).toString('base64url');
  const env = {
    NODE_ENV: 'production',
    PORT: String(PORTS.backend),
    DATABASE_URL: dbUrl,
    DATABASE_URL_PUBLIC: dbUrl.replace(/\/\/[^@]+@/, `//sppg_public:${publicPassword}@`),
    PUBLIC_DB_PASSWORD: publicPassword,
    S3_BUCKET: 'qa-audit-fake',
    // An IP endpoint makes the SDK use path-style URLs; the keys are dummies for the stub above.
    AWS_ENDPOINT_URL_S3: `http://127.0.0.1:${PORTS.s3}`,
    AWS_ACCESS_KEY_ID: 'qa',
    AWS_SECRET_ACCESS_KEY: 'qa',
    MFA_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
    MFA_REQUIRED_ROLES: '',
    // Every test logs in from the same IP; the per-IP limit would trip otherwise.
    AUTH_ENDPOINT_RATE_LIMIT_MAX: '1000',
    AUTH_RATE_LIMIT_MAX: '10000',
  };
  // The seed runner refuses NODE_ENV=production, which this database is not.
  const seedEnv = { ...env, NODE_ENV: 'test' };

  step('migrate', await runAsync('npx', ['prisma', 'migrate', 'deploy'], backend, env));
  step('seed', await runAsync(process.execPath, ['--import', 'tsx', 'prisma/seed.ts'], backend, seedEnv));
  step('seed qa', await runAsync(process.execPath, [tsxCli, 'scripts/seed-qa.ts'], QA, seedEnv));
  await builds;

  const children: ChildProcess[] = [
    spawn(process.execPath, ['dist/src/server.js'], { cwd: backend, env: { ...process.env, ...env }, stdio: 'inherit' }),
    spawn(process.execPath, [join(admin, 'node_modules', 'next', 'dist', 'bin', 'next'), 'start', '-p', String(PORTS.admin)], {
      cwd: admin,
      env: { ...process.env, ...adminEnv },
      stdio: 'inherit',
    }),
  ];
  const stop = async (code: number) => {
    children.forEach((c) => c.kill());
    s3.close();
    await pg?.stop();
    process.exit(code);
  };
  process.on('SIGTERM', () => void stop(0));
  process.on('SIGINT', () => void stop(0));
  children.forEach((c) => c.on('exit', (code) => (console.error(`server exited (${code})`), void stop(1))));
}

function down() {
  if (!existsSync(PID)) return;
  const pid = Number(readFileSync(PID, 'utf8'));
  // Kill the whole tree: serve, both servers and postgres.
  if (process.platform === 'win32') run('taskkill', ['/pid', String(pid), '/T', '/F'], QA);
  else {
    try {
      process.kill(-pid, 'SIGTERM');
    } catch {
      // already gone
    }
  }
  rmSync(PID, { force: true });
}

const cmd = process.argv[2];
if (cmd === 'up') await up();
else if (cmd === 'serve') {
  await serve().catch(async (err: unknown) => {
    console.error(err);
    await pg?.stop();
    process.exit(1);
  });
}
else if (cmd === 'down') down();
else {
  console.error('usage: env.ts up|serve|down');
  process.exit(2);
}
