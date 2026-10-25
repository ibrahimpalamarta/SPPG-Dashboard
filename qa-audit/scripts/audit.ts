/**
 * One command for the whole pipeline, on a laptop or in CI:
 *
 *   npm run audit [-- --suite=smoke|full|uat]
 *
 * Runs the six stages in order with fail-fast (a code Blocker skips stages
 * 2-5), always tears the environment down, and always produces the report.
 * CI runs the same npm scripts as separate steps instead (see .github/workflows/qa-audit.yml).
 */
import { spawnSync } from 'node:child_process';
import { QA } from './lib.js';

const suite = process.argv.find((a) => a.startsWith('--suite='))?.slice(8) ?? 'smoke';
const env: NodeJS.ProcessEnv = { ...process.env, QA_SUITE: suite, QA_STARTED_AT: String(Date.now()) };
const npm = (script: string) => (spawnSync('npm', ['run', script], { cwd: QA, env, stdio: 'inherit', shell: process.platform === 'win32' }).status === 0 ? 'success' : 'failure');

env.OUTCOME_CODE = npm('stage:code');
const codeClean = spawnSync('npm', ['run', 'report', '--', '--stage=code'], { cwd: QA, env, stdio: 'inherit', shell: process.platform === 'win32' }).status === 0;

if (!codeClean) {
  env.OUTCOME_CODE = 'failure';
  for (const s of ['LOGIC', 'ENV', 'E2E', 'UI']) env[`OUTCOME_${s}`] = 'skipped';
} else {
  env.OUTCOME_LOGIC = npm('stage:logic');
  env.OUTCOME_ENV = npm('stage:env');
  env.OUTCOME_E2E = env.OUTCOME_ENV === 'success' ? npm('stage:e2e') : 'skipped';
  // Stage 5 (visual, Lighthouse) arrives in phase 3; axe runs inside stage 4 as @a11y tests.
  env.OUTCOME_UI = 'skipped';
  npm('env:down');
}

process.exit(spawnSync('npm', ['run', 'report'], { cwd: QA, env, stdio: 'inherit', shell: process.platform === 'win32' }).status ?? 1);
