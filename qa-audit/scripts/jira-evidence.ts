/**
 * Screenshots of passing Playwright tests for one Jira ticket, used as proof in
 * the "In Review" comment (QD-34). Reads reports/raw/playwright.json.
 *
 *   jira-evidence SCRUM-20   prints [{ title, screenshot }] as JSON
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ids, pwTests, type PwSuite } from './merge-report.js';
import { RAW } from './lib.js';

export function evidence(suites: PwSuite[], ticket: string): { title: string; screenshot: string }[] {
  const out: { title: string; screenshot: string }[] = [];
  for (const { title, test } of pwTests(suites)) {
    if (test.status !== 'expected' || !ids(title).includes(ticket)) continue;
    // The last result is the run that passed (earlier ones are failed retries).
    const shot = test.results?.at(-1)?.attachments?.find((a) => a.name === 'screenshot')?.path;
    if (shot) out.push({ title, screenshot: shot });
  }
  return out;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const ticket = process.argv[2];
  if (!ticket) throw new Error('usage: npm run evidence -- SCRUM-xx');
  const doc = JSON.parse(readFileSync(join(RAW, 'playwright.json'), 'utf8')) as { suites: PwSuite[] };
  console.log(JSON.stringify(evidence(doc.suites, ticket), null, 2));
}
