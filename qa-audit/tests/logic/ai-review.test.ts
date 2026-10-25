import { describe, expect, it } from 'vitest';
import { buildEfficiencyPrompt, buildPrompt, MAX_DIFF, type Verdict } from '../../scripts/ai-review.js';
import type { Finding } from '../../scripts/merge-report.js';

const v = (findings: Finding[]): Verdict => ({ verdict: 'fail', stages: { code: 'failure' }, findings, pending: [], requirements: [] });
const leak: Finding = { severity: 'Blocker', tool: 'gitleaks', rule: 'aws-access-token', location: 'backend/.env.example:3', message: 'AKIAREALSECRETVALUE' };
const tsc: Finding = { severity: 'Blocker', tool: 'tsc', rule: 'TS2322', location: 'backend/src/x.ts:4', message: 'Type string is not assignable' };
const diff = (path: string, body: string) => `diff --git a/${path} b/${path}\n+${body}\n`;

describe('ai-review prompt', () => {
  it('[QA-AI] secret gitleaks tidak pernah dikirim: pesan dan diff file-nya dibuang', () => {
    const p = buildPrompt(v([leak, tsc]), diff('backend/.env.example', 'AKIAREALSECRETVALUE') + diff('backend/src/x.ts', 'const a: number = "x"'))!;
    expect(p).not.toContain('AKIAREALSECRETVALUE');
    expect(p).toContain('gitleaks aws-access-token backend/.env.example:3');
    expect(p).toContain('const a: number');
  });

  it('[QA-AI] Info dan temuan waived tidak dikirim; tanpa Blocker/Warning tidak ada panggilan', () => {
    expect(buildPrompt(v([{ ...tsc, severity: 'Info' }, { ...tsc, waived: 'x' }]), '')).toBeNull();
  });

  it('[QA-AI] review efisiensi jalan tanpa temuan tool, tapi diff file gitleaks tetap dibuang', () => {
    const code = diff('backend/src/x.ts', 'const a = 1');
    expect(buildEfficiencyPrompt(v([]), code)).toContain('const a = 1');
    const p = buildEfficiencyPrompt(v([leak]), diff('backend/.env.example', 'AKIAREALSECRETVALUE') + code)!;
    expect(p).not.toContain('AKIAREALSECRETVALUE');
    expect(p).toContain('const a = 1');
  });

  it('[QA-AI] review efisiensi dilewati bila diff kosong atau hanya file gitleaks', () => {
    expect(buildEfficiencyPrompt(v([]), '  \n')).toBeNull();
    expect(buildEfficiencyPrompt(v([leak]), diff('backend/.env.example', 'x'))).toBeNull();
  });

  it('[QA-AI] diff dipotong di batas', () => {
    const p = buildPrompt(v([tsc]), diff('a.ts', 'x'.repeat(MAX_DIFF * 2)))!;
    expect(p.length).toBeLessThan(MAX_DIFF + 2_000);
    expect(p).toContain('dipotong');
  });
});
