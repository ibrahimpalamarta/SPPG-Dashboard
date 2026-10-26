import { mkdirSync } from 'node:fs';
import type { Locator, Page } from '@playwright/test';
import sharp from 'sharp';

// Step screenshot for the Jira "In Review" comment (QD-37): reports/evidence/<ticket>/<n>-<name>.avif.
export async function shot(target: Page | Locator, ticket: string, n: number, name: string) {
  const dir = `reports/evidence/${ticket}`;
  mkdirSync(dir, { recursive: true });
  await sharp(await target.screenshot()).avif({ quality: 50 }).toFile(`${dir}/${n}-${name}.avif`);
}
