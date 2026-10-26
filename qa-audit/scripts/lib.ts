import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const QA = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const REPO = resolve(QA, '..');
export const REPORTS = join(QA, 'reports');
export const RAW = join(REPORTS, 'raw');
/** Seed credentials and storageState. Never uploaded as an artifact (reports/ is). */
export const AUTH = join(QA, '.auth');

// Optional local overrides (see .env.example); real environment variables win.
if (existsSync(join(QA, '.env'))) process.loadEnvFile(join(QA, '.env'));

export const PORTS = { db: 15432, backend: 18080, admin: 13000 } as const;

export type RunResult = { code: number; out: string; missing: boolean };

/** Runs a command to completion. `missing` = the executable is not installed. */
export function run(cmd: string, args: string[], cwd: string, env: NodeJS.ProcessEnv = {}): RunResult {
  // npx/npm are .cmd shims on Windows and need a shell; native tools do not.
  const shell = process.platform === 'win32' && /^(npx|npm)$/.test(cmd);
  const r = spawnSync(cmd, args, { cwd, env: { ...process.env, ...env }, encoding: 'utf8', shell, maxBuffer: 256 * 1024 * 1024 });
  const missing = (r.error as NodeJS.ErrnoException | undefined)?.code === 'ENOENT';
  return { code: r.status ?? 1, out: `${r.stdout ?? ''}${r.stderr ?? ''}`, missing };
}

/** Same contract as `run`, but does not block the event loop, so independent tools can overlap. */
export function runAsync(cmd: string, args: string[], cwd: string, env: NodeJS.ProcessEnv = {}): Promise<RunResult> {
  const shell = process.platform === 'win32' && /^(npx|npm)$/.test(cmd);
  return new Promise((resolvePromise) => {
    const child = spawn(cmd, args, { cwd, env: { ...process.env, ...env }, shell });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d: Buffer) => (stdout += d));
    child.stderr.on('data', (d: Buffer) => (stderr += d));
    child.on('error', (e: NodeJS.ErrnoException) => resolvePromise({ code: 1, out: `${stdout}${stderr}`, missing: e.code === 'ENOENT' }));
    child.on('close', (code) => resolvePromise({ code: code ?? 1, out: `${stdout}${stderr}`, missing: false }));
  });
}

export function writeJson(path: string, data: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2));
}
