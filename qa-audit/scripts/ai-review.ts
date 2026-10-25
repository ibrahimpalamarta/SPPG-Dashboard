/**
 * Advisory AI analysis of the qa-audit findings (QD-30). Runs after merge-report,
 * reads reports/verdict.json plus the PR diff, asks an OpenAI-compatible model
 * for likely causes and fixes, and appends the answer to pr-comment.md and
 * scorecard.html. Never changes the verdict and always exits 0.
 *
 *   AI_API_KEY   empty = skipped (local runs, fork PRs)
 *   AI_BASE_URL  default https://openrouter.ai/api/v1
 *   AI_MODEL     required with AI_API_KEY
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { REPO, REPORTS, run } from './lib.js';
import type { Finding } from './merge-report.js';

export type Verdict = { verdict: string; stages: Record<string, string>; findings: Finding[]; pending: string[]; requirements: { id: string; status: string }[] };

export const MAX_FINDINGS = 50;
export const MAX_DIFF = 60_000;
const SYSTEM = `Kamu reviewer QA untuk monorepo SPPG Dashboard (Express + Prisma backend, Next.js frontend).
Input: temuan tool qa-audit (tsc, eslint, semgrep, gitleaks, vitest, playwright, ci) dan diff PR.
Untuk tiap temuan (urut Blocker dulu), pakai persis format ini:
#### N. \`rule\` — \`file:baris\`
- **Penyebab:** satu atau dua kalimat.
- **Perbaikan:** langkah konkret, potongan kode singkat bila perlu.
Kelompokkan temuan yang akarnya sama. Jangan menilai prioritas atau severity: itu sudah ditentukan gate.
Jangan mengarang temuan yang tidak ada di input. Bila file temuan tidak ada di diff, baca dari lokasi
yang tertera dan jangan berkomentar soal diff yang tidak lengkap.
Jangan pernah menampilkan nilai secret. Jawab dalam bahasa Indonesia, tanpa pembuka/penutup, maksimal ~400 kata.`;

/** Pure, so tests/logic/ai-review.test.ts can pin what leaves CI. */
export function buildPrompt(v: Verdict, diff: string): string | null {
  const findings = v.findings.filter((f) => !f.waived && f.severity !== 'Info').slice(0, MAX_FINDINGS);
  if (findings.length === 0) return null;
  // A gitleaks message can quote the secret itself: send only where, never what.
  const leaked = new Set(findings.filter((f) => f.tool === 'gitleaks' && f.location).map((f) => f.location!.replace(/:\d+$/, '')));
  const lines = findings.map((f) =>
    f.tool === 'gitleaks' ? `- [${f.severity}] gitleaks ${f.rule} ${f.location ?? ''} (isi disembunyikan)` : `- [${f.severity}] ${f.tool} ${f.rule} ${f.location ?? ''}: ${f.message.slice(0, 500)}`,
  );
  const safeDiff = diff
    .split(/^(?=diff --git )/m)
    .filter((chunk) => ![...leaked].some((path) => chunk.startsWith(`diff --git a/${path} `)))
    .join('');
  return [
    `Verdict: ${v.verdict}`,
    `Tahap: ${Object.entries(v.stages).map(([k, s]) => `${k}=${s}`).join(', ')}`,
    `Temuan (${findings.length}):`,
    ...lines,
    '',
    safeDiff.length > MAX_DIFF ? `Diff PR (dipotong ${MAX_DIFF} karakter):` : 'Diff PR:',
    '```diff',
    safeDiff.slice(0, MAX_DIFF),
    '```',
  ].join('\n');
}

async function ask(prompt: string): Promise<string> {
  const base = process.env.AI_BASE_URL || 'https://openrouter.ai/api/v1';
  if (!process.env.AI_MODEL) throw new Error('AI_MODEL kosong');
  const res = await fetch(`${base.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.AI_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: process.env.AI_MODEL, temperature: 0.2, messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: prompt }] }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = body.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('respons kosong');
  return text;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

async function main() {
  const verdictFile = join(REPORTS, 'verdict.json');
  if (!process.env.AI_API_KEY || !existsSync(verdictFile)) return console.log('ai-review: dilewati (AI_API_KEY atau verdict.json tidak ada)');
  const v = JSON.parse(readFileSync(verdictFile, 'utf8')) as Verdict;
  const diff = run('git', ['diff', process.env.QA_GIT_RANGE ?? 'origin/develop..HEAD', '--', 'backend', 'frontend-admin', 'frontend-public', 'qa-audit', 'infra'], REPO).out;
  const prompt = buildPrompt(v, diff);
  if (!prompt) return console.log('ai-review: dilewati (tidak ada Blocker/Warning)');

  let section: string;
  try {
    section = `${await ask(prompt)}\n\n<sub>Model \`${process.env.AI_MODEL}\`. Saran otomatis, verifikasi sendiri; verdict tetap dari gate.json.</sub>`;
  } catch (e) {
    section = `Analisis AI tidak tersedia: ${(e as Error).message}`;
  }
  writeFileSync(join(REPORTS, 'ai-review.md'), section);
  const comment = join(REPORTS, 'pr-comment.md');
  // Folded: the verdict and the must-fix table stay the first thing a reviewer reads.
  if (existsSync(comment)) writeFileSync(comment, `${readFileSync(comment, 'utf8')}\n\n<details><summary>🤖 Analisis AI (saran, bukan gate)</summary>\n\n${section}\n\n</details>\n`);
  const card = join(REPORTS, 'scorecard.html');
  if (existsSync(card)) writeFileSync(card, readFileSync(card, 'utf8').replace('</body>', `<h2>Analisis AI (saran, bukan gate)</h2><pre style="white-space:pre-wrap">${esc(section)}</pre></body>`));
  console.log(`ai-review: ${section.startsWith('Analisis AI tidak tersedia') ? section : 'ditulis ke reports/ai-review.md'}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main().catch((e: Error) => console.log(`ai-review: gagal, dilewati: ${e.message}`));
