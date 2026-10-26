/**
 * Stage 1 (code audit). Collects only: every tool writes its raw output to
 * reports/raw/, and merge-report decides what is a Blocker. Exits non-zero
 * only when this script itself breaks, never because a tool found something.
 */
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { RAW, REPO, run, writeJson } from './lib.js';

const backend = join(REPO, 'backend');
const admin = join(REPO, 'frontend-admin');

rmSync(RAW, { recursive: true, force: true });

// Type check. Prisma types and Next's route types are generated, so each
// check runs its generator first. A failed generator (on Windows: a running
// dev server locks the Prisma engine) is recorded on its own and tsc still
// runs against what was generated before.
const typeChecks = [
  { name: 'backend', cwd: backend, prepare: ['prisma', 'generate'] },
  { name: 'frontend-admin', cwd: admin, prepare: ['next', 'typegen'] },
];
for (const t of typeChecks) {
  const prep = run('npx', t.prepare, t.cwd);
  const tsc = run('npx', ['tsc', '--noEmit', '--pretty', 'false'], t.cwd);
  writeJson(join(RAW, `tsc-${t.name}.json`), { exitCode: tsc.code, output: tsc.out, ...(prep.code !== 0 && { prepareFailed: prep.out }) });
}

// ESLint with the app's own config. The a11y rule count proves jsx-a11y is on.
const eslintOut = join(RAW, 'eslint-frontend-admin.json');
run('npx', ['eslint', '-f', 'json', '-o', eslintOut, '.'], admin);
const printed = run('npx', ['eslint', '--print-config', 'app/layout.tsx'], admin);
const rules = printed.code === 0 ? (JSON.parse(printed.out) as { rules?: Record<string, unknown> }).rules ?? {} : {};
writeJson(join(RAW, 'eslint-a11y-rules.json'), { rules: Object.keys(rules).filter((r) => r.startsWith('jsx-a11y/')) });

// knip: unused files, exports and dependencies. Exit 1 only means it found something; 2+ is a broken run.
const knip = run('npx', ['knip', '--reporter', 'json'], admin);
if (knip.code > 1) writeJson(join(RAW, 'knip.error.json'), { exitCode: knip.code, output: knip.out });
else writeJson(join(RAW, 'knip-frontend-admin.json'), { output: knip.out });

// Semgrep and gitleaks are optional on a laptop: a missing tool is recorded,
// and merge-report treats that as Info locally and as an infra Blocker in CI.
const full = process.env.QA_SECURITY_FULL === '1';
const semgrep = run(
  'semgrep',
  [
    'scan', '--metrics', 'off', '--quiet', '--sarif', '--output', join(RAW, 'semgrep.sarif'),
    '--config', 'p/typescript', '--config', join(REPO, 'qa-audit', 'semgrep'),
    ...(full ? ['--config', 'p/default'] : []),
    join(backend, 'src'), join(backend, 'scripts'), join(admin, 'app'), join(admin, 'lib'), join(admin, 'components'),
  ],
  REPO,
);
if (semgrep.missing) writeJson(join(RAW, 'semgrep.skipped.json'), { reason: 'semgrep tidak terpasang' });
else if (semgrep.code !== 0) writeJson(join(RAW, 'semgrep.error.json'), { exitCode: semgrep.code, output: semgrep.out });

// PR: only the commits under review. Weekly (QA_SECURITY_FULL=1): whole history.
const range = process.env.QA_GIT_RANGE ?? 'origin/develop..HEAD';
const gitleaks = run(
  'gitleaks',
  ['git', REPO, '--redact', '--exit-code', '0', '--report-format', 'sarif', '--report-path', join(RAW, 'gitleaks.sarif'), ...(full ? [] : ['--log-opts', range])],
  REPO,
);
if (gitleaks.missing) writeJson(join(RAW, 'gitleaks.skipped.json'), { reason: 'gitleaks tidak terpasang' });
else if (gitleaks.code !== 0) writeJson(join(RAW, 'gitleaks.error.json'), { exitCode: gitleaks.code, output: gitleaks.out });
