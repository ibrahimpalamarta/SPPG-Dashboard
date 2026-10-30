import { mkdirSync } from 'node:fs';
import type { Locator, Page } from '@playwright/test';

// Step screenshot for the Jira "In Review" comment (QD-37): reports/evidence/<ticket>/<n>-<name>.png.
// PNG, not AVIF: Jira's media viewer decodes the AVIF with a red cast.
export async function shot(target: Page | Locator, ticket: string, n: number, name: string) {
  const dir = `reports/evidence/${ticket}`;
  mkdirSync(dir, { recursive: true });
  await target.screenshot({ path: `${dir}/${n}-${name}.png` });
}
