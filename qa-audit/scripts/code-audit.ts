/**
 * Stage 1 (code audit). Collects only: every tool writes its raw output to
 * reports/raw/, and merge-report decides what is a Blocker. Exits non-zero
 * only when this script itself breaks, never because a tool found something.
 *
 * Four lanes run side by side (backend types, frontend-admin checks, Semgrep,
 * gitleaks). Each lane writes its own raw files, so the order they finish in
 * never reaches merge-report; inside a lane, a tool that needs a generated
 * input still waits for its generator.
 */
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { RAW, REPO, runAsync, writeJson, type RunResult } from './lib.js';

const backend = join(REPO, 'backend');
const admin = join(REPO, 'frontend-admin');

rmSync(RAW, { recursive: true, force: true });
mkdirSync(RAW, { recursive: true });

// Type check. Prisma types and Next's route types are generated, so each
// check runs its generator first. A failed generator (on Windows: a running
// dev server locks the Prisma engine) is recorded on its own and tsc still
// runs against what was generated before.
async function tsc(name: string, cwd: string, prep: RunResult) {
  const r = await runAsync('npx', ['tsc', '--noEmit', '--pretty', 'false'], cwd);
  writeJson(join(RAW, `tsc-${name}.json`), { exitCode: r.code, output: r.out, ...(prep.code !== 0 && { prepareFailed: prep.out }) });
}

// ESLint with the app's own config. The a11y rule count proves jsx-a11y is on.
async function eslint() {
  const eslintOut = join(RAW, 'eslint-frontend-admin.json');
  const [, printed] = await Promise.all([runAsync('npx', ['eslint', '-f', 'json', '-o', eslintOut, '.'], admin), runAsync('npx', ['eslint', '--print-config', 'app/layout.tsx'], admin)]);
  const rules = printed.code === 0 ? (JSON.parse(printed.out) as { rules?: Record<string, unknown> }).rules ?? {} : {};
  writeJson(join(RAW, 'eslint-a11y-rules.json'), { rules: Object.keys(rules).filter((r) => r.startsWith('jsx-a11y/')) });
}

// knip: unused files, exports and dependencies. Exit 1 only means it found something; 2+ is a broken run.
async function knip() {
  const r = await runAsync('npx', ['knip', '--reporter', 'json'], admin);
  if (r.code > 1) writeJson(join(RAW, 'knip.error.json'), { exitCode: r.code, output: r.out });
  else writeJson(join(RAW, 'knip-frontend-admin.json'), { output: r.out });
}

// Semgrep and gitleaks are optional on a laptop: a missing tool is recorded,
// and merge-report treats that as Info locally and as an infra Blocker in CI.
const full = process.env.QA_SECURITY_FULL === '1';

async function semgrep() {
  const r = await runAsync(
    'semgrep',
    [
      'scan', '--metrics', 'off', '--quiet', '--sarif', '--output', join(RAW, 'semgrep.sarif'),
      '--config', 'p/typescript', '--config', join(REPO, 'qa-audit', 'semgrep'),
      ...(full ? ['--config', 'p/default'] : []),
      join(backend, 'src'), join(backend, 'scripts'), join(admin, 'app'), join(admin, 'lib'), join(admin, 'components'),
    ],
    REPO,
  );
  if (r.missing) writeJson(join(RAW, 'semgrep.skipped.json'), { reason: 'semgrep tidak terpasang' });
  else if (r.code !== 0) writeJson(join(RAW, 'semgrep.error.json'), { exitCode: r.code, output: r.out });
}

// PR: only the commits under review. Weekly (QA_SECURITY_FULL=1): whole history.
async function gitleaks() {
  const range = process.env.QA_GIT_RANGE ?? 'origin/develop..HEAD';
  const r = await runAsync(
    'gitleaks',
    ['git', REPO, '--redact', '--exit-code', '0', '--report-format', 'sarif', '--report-path', join(RAW, 'gitleaks.sarif'), ...(full ? [] : ['--log-opts', range])],
    REPO,
  );
  if (r.missing) writeJson(join(RAW, 'gitleaks.skipped.json'), { reason: 'gitleaks tidak terpasang' });
  else if (r.code !== 0) writeJson(join(RAW, 'gitleaks.error.json'), { exitCode: r.code, output: r.out });
}

await Promise.all([
  (async () => tsc('backend', backend, await runAsync('npx', ['prisma', 'generate'], backend)))(),
  (async () => {
    const prep = await runAsync('npx', ['next', 'typegen'], admin);
    await Promise.all([tsc('frontend-admin', admin, prep), eslint(), knip()]);
  })(),
  semgrep(),
  gitleaks(),
]);
