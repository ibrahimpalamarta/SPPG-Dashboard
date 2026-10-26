import { describe, expect, it } from 'vitest';
import { evidence } from '../../scripts/jira-evidence.js';

const shot = (path: string) => ({ attachments: [{ name: 'screenshot', path }] });
const suites = [
  {
    title: 'login.spec.ts',
    file: 'login.spec.ts',
    specs: [
      { title: '[SCRUM-20] lulus @smoke', tests: [{ projectName: 'chromium', status: 'expected', results: [shot('a.png')] }] },
      { title: '[SCRUM-20] lulus setelah retry', tests: [{ projectName: 'chromium', status: 'flaky', results: [shot('b1.png'), shot('b2.png')] }] },
      { title: '[SCRUM-20] gagal', tests: [{ projectName: 'chromium', status: 'unexpected', results: [shot('c.png')] }] },
      { title: '[SCRUM-200] tiket lain', tests: [{ projectName: 'chromium', status: 'expected', results: [shot('d.png')] }] },
    ],
  },
];

describe('jira-evidence', () => {
  it('[QA-EVIDENCE] hanya screenshot test yang lulus dengan ID tiket persis', () => {
    expect(evidence(suites, 'SCRUM-20')).toEqual([{ title: '[SCRUM-20] lulus @smoke', screenshot: 'a.png' }]);
  });
});
