import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { collect, evaluate, type Finding, type Gate, type Requirement, type TestCase } from '../../scripts/merge-report.js';

const gate = JSON.parse(readFileSync('gate.json', 'utf8')) as Gate;
const today = '2026-11-01';
const req = (id: string, target: string | null = '2026-11-14', priority = 'P0'): Requirement => ({ source: 'prd', id, title: id, ac: '', priority, target, refs: [] });
const tc = (title: string, status: TestCase['status']): TestCase => ({ title, ids: [...title.matchAll(/\[([A-Z0-9-]+)\]/g)].map((m) => m[1]!), tags: [], status, source: 'playwright' });
const run = (o: { findings?: Finding[]; tests?: TestCase[]; requirements?: Requirement[]; waivers?: Gate['waivers']; outcomes?: Record<string, string>; on?: string }) =>
  evaluate({ gate: { ...gate, waivers: o.waivers ?? [] }, requirements: o.requirements ?? [], findings: o.findings ?? [], tests: o.tests ?? [], outcomes: o.outcomes ?? {}, today: o.on ?? today });

const secret: Finding = { severity: 'Blocker', tool: 'gitleaks', rule: 'aws-access-token', location: 'backend/.env.example:3', message: 'secret' };
const semgrepError: Finding = { severity: 'Blocker', tool: 'semgrep', rule: 'raw-sql', location: 'backend/src/x.ts:1', message: 'raw sql' };

describe('gate', () => {
  it('[QA-GATE] tanpa Blocker -> pass, Blocker -> fail', () => {
    expect(run({}).verdict).toBe('pass');
    expect(run({ findings: [semgrepError] }).verdict).toBe('fail');
  });

  it('[QA-GATE] waiver berlaku menghapus Blocker dari verdict, kedaluwarsa kembali Blocker', () => {
    const waiver = { match: 'semgrep:raw-sql', reason: 'format() aman', owner: 'ItsMauls', expires: '2026-11-30' };
    expect(run({ findings: [semgrepError], waivers: [waiver] }).verdict).toBe('pass');
    const expired = run({ findings: [semgrepError], waivers: [waiver], on: '2026-12-01' });
    expect(expired.verdict).toBe('fail');
    expect(expired.findings[0]!.waived).toBeUndefined();
  });

  it('[QA-GATE] waiver tanpa alasan/owner/tanggal ditolak', () => {
    expect(run({ findings: [semgrepError], waivers: [{ match: 'semgrep:raw-sql' }] }).verdict).toBe('fail');
  });

  it('[QA-GATE] temuan secret tidak bisa di-waive', () => {
    const v = run({ findings: [secret], waivers: [{ match: 'gitleaks:', reason: 'test key', owner: 'x', expires: '2027-01-01' }] });
    expect(v.verdict).toBe('fail');
    expect(v.findings.some((f) => f.rule === 'waiver-forbidden')).toBe(true);
  });

  it('[QA-GATE] environment gagal -> infra-error, bukan fail produk', () => {
    expect(run({ outcomes: { env: 'failure' } }).verdict).toBe('infra-error');
  });

  it('[QA-GATE] tahap gagal tanpa laporan tetap Blocker', () => {
    expect(run({ outcomes: { logic: 'failure' } }).verdict).not.toBe('pass');
  });

  it('[QA-GATE] CI build gagal membuat verdict fail', () => {
    expect(run({ outcomes: { ci: 'failure' } }).verdict).toBe('fail');
  });

  it('[QA-GATE] status requirement mengikuti test', () => {
    const v = run({
      requirements: [req('AC-DQ-01'), req('AC-DQ-02'), req('AC-DASH-04'), req('AC-UP-01'), req('OD-02', null, 'decision')],
      tests: [tc('[AC-DQ-01] ok', 'passed'), tc('[AC-DQ-02] rusak', 'failed'), tc('[AC-DASH-04][OD-02] fixme', 'fixme')],
    });
    expect(Object.fromEntries(v.requirements.map((r) => [r.id, r.status]))).toEqual({
      'AC-DQ-01': 'Lulus',
      'AC-DQ-02': 'Gagal',
      'AC-DASH-04': 'Menunggu keputusan',
      'AC-UP-01': 'Belum ada test',
      'OD-02': 'Menunggu keputusan',
    });
  });

  it('[QA-GATE] fitur belum ada jadi Blocker setelah tanggal target', () => {
    const input = { requirements: [req('AC-PUB-01')], tests: [tc('[AC-PUB-01] publish', 'fixme')] };
    expect(run({ ...input, on: '2026-11-14' }).verdict).toBe('pass');
    expect(run({ ...input, on: '2026-11-15' }).verdict).toBe('fail');
  });

  it('[QA-GATE] tool hilang: Info di laptop, infra-error di CI', () => {
    const read = () => ({ reason: 'semgrep tidak terpasang' });
    const local = collect(read, ['semgrep.skipped.json'], gate, false);
    expect(local.findings[0]!.severity).toBe('Info');
    const ci = collect(read, ['semgrep.skipped.json'], gate, true);
    expect(run({ findings: ci.findings }).verdict).toBe('infra-error');
  });

  it('[QA-GATE] login setup gagal adalah Blocker', () => {
    const doc = { suites: [{ title: 'auth.setup.ts', file: 'auth.setup.ts', specs: [{ title: 'login finance', tags: [], tests: [{ projectName: 'setup', status: 'unexpected' }] }] }] };
    const { findings } = collect(() => doc, ['playwright.json'], gate, true);
    expect(findings[0]!.severity).toBe('Blocker');
  });
});
