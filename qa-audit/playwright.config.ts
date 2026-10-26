import { mkdirSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';
import { assertSafeTarget } from './scripts/guard.js';
import { PORTS } from './scripts/lib.js';

// Trailing slash matters: tests navigate with relative paths ("login"), which
// resolve under /admin/. An absolute "/login" would drop the basePath.
const baseURL = process.env.QA_BASE_URL ?? `http://localhost:${PORTS.admin}/admin/`;
assertSafeTarget(baseURL);
mkdirSync('reports/raw', { recursive: true });

// Suite = which tags run. `--list` ignores it so merge-report gets the full
// inventory and can tell "not in this suite" apart from "no test yet".
const SUITES: Record<string, RegExp | undefined> = {
  smoke: /@smoke|@rbac|@pii|@a11y/,
  full: undefined,
  uat: /@uat|@demo/,
};
const suite = process.env.QA_SUITE ?? 'smoke';
const listing = process.argv.includes('--list');
const invert = [suite === 'smoke' && '@quarantine', !(process.env.CI || process.env.RUN_VISUAL) && '@visual'].filter(Boolean);

export default defineConfig({
  testDir: 'tests/e2e',
  outputDir: 'reports/playwright-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['json', { outputFile: 'reports/raw/playwright.json' }], ['html', { outputFolder: 'reports/playwright-report', open: 'never' }]],
  use: {
    baseURL,
    viewport: { width: 1440, height: 900 },
    colorScheme: 'light',
    reducedMotion: 'reduce',
    locale: 'id-ID',
    timezoneId: 'Asia/Jakarta',
    trace: 'on-first-retry',
    // 'on': screenshots of passing tests are the Jira evidence (QD-34).
    screenshot: 'on',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
      dependencies: ['setup'],
      // On the project, not top-level: the setup logins carry no tags.
      grep: listing ? undefined : SUITES[suite],
      grepInvert: listing || invert.length === 0 ? undefined : new RegExp(invert.join('|')),
    },
  ],
});
