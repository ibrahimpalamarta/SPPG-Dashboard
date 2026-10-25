/**
 * Advisory AI analysis (QD-30, QD-33). Runs after merge-report, reads
 * reports/verdict.json plus the PR diff and asks an OpenAI-compatible model
 * two independent questions in parallel: why the tool findings happened and how
 * to fix them, and what in the diff is over-built. The answers are appended to
 * pr-comment.md and scorecard.html. Never changes the verdict, always exits 0.
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

const FINDINGS_SYSTEM = `Kamu reviewer QA untuk monorepo SPPG Dashboard (Express + Prisma backend, Next.js frontend).
Input: temuan tool qa-audit (tsc, eslint, knip, semgrep, gitleaks, vitest, playwright, ci) dan diff PR.
Untuk tiap temuan (urut Blocker dulu), pakai persis format ini:
#### N. \`rule\` — \`file:baris\`
- **Penyebab:** satu atau dua kalimat.
- **Perbaikan:** langkah konkret, potongan kode singkat bila perlu.
Kelompokkan temuan yang akarnya sama. Jangan menilai prioritas atau severity: itu sudah ditentukan gate.
Jangan mengarang temuan yang tidak ada di input. Bila file temuan tidak ada di diff, baca dari lokasi
yang tertera dan jangan berkomentar soal diff yang tidak lengkap.
Jangan pernah menampilkan nilai secret. Jawab dalam bahasa Indonesia, tanpa pembuka/penutup, maksimal ~400 kata.`;

// Same rules as the ponytail skill, as a reviewer: find what to delete, not what to add.
const EFFICIENCY_SYSTEM = `Kamu reviewer efisiensi kode untuk monorepo SPPG Dashboard (Express + Prisma backend, Next.js frontend).
Input: diff PR. Tinjau HANYA baris yang ditambahkan (+). Cari yang bisa dihapus atau disederhanakan, urut dari yang paling berdampak:
1. Fungsi/util/tipe yang sudah ada di codebase, stdlib, atau platform (CSS, elemen HTML native) tetapi ditulis ulang.
2. Dependency baru untuk pekerjaan yang cukup beberapa baris, atau yang sudah dicakup dependency terpasang.
3. Abstraksi spekulatif: interface satu implementasi, factory satu produk, config untuk nilai yang tidak pernah berubah, parameter tak terpakai.
4. React useEffect yang bisa dihitung saat render, dipindah ke event handler, atau useMemo; state yang sebenarnya turunan dari state/props lain.
5. Kode mati, import/variabel tak terpakai, try/catch yang hanya menelan error, komentar yang mengulang isi kode.
Tiap temuan persis:
#### N. \`file:baris\` (baris dari header hunk @@)
- **Pangkas:** apa yang berlebihan.
- **Ganti dengan:** pengganti yang lebih sederhana, kode singkat bila perlu.
Hanya laporkan yang jelas terlihat dari diff; jangan menebak isi file di luar diff. Maksimal 8 temuan.
Bila tidak ada, jawab satu baris: "Tidak ada temuan." Jangan menampilkan nilai secret.
Bahasa Indonesia, tanpa pembuka/penutup.`;

/**
 * Drops the diff of every file gitleaks flagged (a diff of it can contain the
 * secret itself) and caps the size. Pure, so tests pin what leaves CI.
 */
export function redactDiff(findings: Finding[], diff: string): string {
  const leaked = new Set(findings.filter((f) => f.tool === 'gitleaks' && !f.waived && f.location).map((f) => f.location!.replace(/:\d+$/, '')));
  return diff
    .split(/^(?=diff --git )/m)
    .filter((chunk) => ![...leaked].some((path) => chunk.startsWith(`diff --git a/${path} `)))
    .join('')
    .slice(0, MAX_DIFF);
}

const diffBlock = (full: string, safe: string) => [full.length > MAX_DIFF ? `Diff PR (dipotong ${MAX_DIFF} karakter):` : 'Diff PR:', '```diff', safe, '```'];

export function buildPrompt(v: Verdict, diff: string): string | null {
  const findings = v.findings.filter((f) => !f.waived && f.severity !== 'Info').slice(0, MAX_FINDINGS);
  if (findings.length === 0) return null;
  // A gitleaks message can quote the secret itself: send only where, never what.
  const lines = findings.map((f) =>
    f.tool === 'gitleaks' ? `- [${f.severity}] gitleaks ${f.rule} ${f.location ?? ''} (isi disembunyikan)` : `- [${f.severity}] ${f.tool} ${f.rule} ${f.location ?? ''}: ${f.message.slice(0, 500)}`,
  );
  return [
    `Verdict: ${v.verdict}`,
    `Tahap: ${Object.entries(v.stages).map(([k, s]) => `${k}=${s}`).join(', ')}`,
    `Temuan (${findings.length}):`,
    ...lines,
    '',
    ...diffBlock(diff, redactDiff(v.findings, diff)),
  ].join('\n');
}

export function buildEfficiencyPrompt(v: Verdict, diff: string): string | null {
  const safe = redactDiff(v.findings, diff);
  return safe.trim() ? diffBlock(diff, safe).join('\n') : null;
}

async function ask(system: string, prompt: string): Promise<string> {
  const base = process.env.AI_BASE_URL || 'https://openrouter.ai/api/v1';
  if (!process.env.AI_MODEL) throw new Error('AI_MODEL kosong');
  const res = await fetch(`${base.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.AI_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: process.env.AI_MODEL, temperature: 0.2, messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }] }),
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
  // Code only: lockfiles and markdown are noise for both questions.
  const diff = run('git', ['diff', process.env.QA_GIT_RANGE ?? 'origin/develop..HEAD', '--', 'backend', 'frontend-admin', 'frontend-public', 'qa-audit', 'infra', ':(exclude,glob)**/package-lock.json', ':(exclude,glob)**/*.md'], REPO).out;
  const questions = [
    { title: 'Temuan tool', prompt: buildPrompt(v, diff), system: FINDINGS_SYSTEM },
    { title: 'Efisiensi kode', prompt: buildEfficiencyPrompt(v, diff), system: EFFICIENCY_SYSTEM },
  ].filter((q): q is typeof q & { prompt: string } => q.prompt !== null);
  if (questions.length === 0) return console.log('ai-review: dilewati (tidak ada temuan dan diff kosong)');

  // Independent questions: wall time is the slower one, not the sum.
  const answers = await Promise.allSettled(questions.map((q) => ask(q.system, q.prompt)));
  const parts = questions.map((q, i) => {
    const a = answers[i]!;
    return `**${q.title}**\n\n${a.status === 'fulfilled' ? a.value : `Analisis AI tidak tersedia: ${(a.reason as Error).message}`}`;
  });
  const section = `${parts.join('\n\n')}\n\n<sub>Model \`${process.env.AI_MODEL}\`. Saran otomatis, verifikasi sendiri; verdict tetap dari gate.json.</sub>`;

  writeFileSync(join(REPORTS, 'ai-review.md'), section);
  const comment = join(REPORTS, 'pr-comment.md');
  // Folded: the verdict and the must-fix table stay the first thing a reviewer reads.
  if (existsSync(comment)) writeFileSync(comment, `${readFileSync(comment, 'utf8')}\n\n<details><summary>🤖 Analisis AI (saran, bukan gate)</summary>\n\n${section}\n\n</details>\n`);
  const card = join(REPORTS, 'scorecard.html');
  if (existsSync(card)) writeFileSync(card, readFileSync(card, 'utf8').replace('</body>', `<h2>Analisis AI (saran, bukan gate)</h2><pre style="white-space:pre-wrap">${esc(section)}</pre></body>`));
  console.log(`ai-review: ${answers.filter((a) => a.status === 'fulfilled').length}/${answers.length} jawaban ditulis ke reports/ai-review.md`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main().catch((e: Error) => console.log(`ai-review: gagal, dilewati: ${e.message}`));
