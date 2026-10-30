import { z } from 'zod';
import { env } from '../../config/env.js';
import type { ColumnDiff } from '../mapping/detect.js';

/**
 * SCRUM-150 (PRD FR-AI-01, NFR-11): the AI reads the columns of an upload and
 * words a fix per problem. It only ever sees header names and issue codes with
 * counts, never a cell value, so nothing about suppliers, amounts or
 * beneficiaries leaves the system. It advises; the profile, the DQ rules and
 * the auto-publish decision stay deterministic.
 */

const advice = z.object({
  columns: z.array(z.object({ header: z.string(), readAs: z.string().nullable(), reason: z.string() })).max(30),
  issues: z.array(z.object({ code: z.string(), advice: z.string() })).max(30),
});
export type UploadAdvice = z.infer<typeof advice>;

export type Ask = (system: string, prompt: string) => Promise<string>;

const SYSTEM = `Kamu asisten pengecekan file unggahan untuk dashboard SPPG. Input: perbedaan nama kolom file dengan format yang dikenal, dan kode masalah validasi beserta jumlahnya. Tidak ada isi sel.
Balas HANYA JSON: {"columns":[{"header":"...","readAs":"..."|null,"reason":"..."}],"issues":[{"code":"...","advice":"..."}]}
- columns: untuk tiap kolom file yang tidak dikenal, pilih satu kolom yang hilang yang paling mungkin sama artinya sebagai readAs (persis seperti tertulis di daftar hilang), atau null bila tidak yakin. reason satu kalimat.
- issues: satu saran perbaikan singkat (maks. 1 kalimat) per kode masalah. Jangan mengarang angka atau nilai.
Bahasa Indonesia.`;

/** The model call, kept apart so tests can feed an answer without a network. */
export const askModel: Ask = async (system, prompt) => {
  const res = await fetch(`${env.AI_BASE_URL.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { authorization: `Bearer ${env.AI_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: env.AI_MODEL, temperature: 0.1, messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }] }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = body.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('empty response');
  return text;
};

/**
 * Null when there is nothing to ask, the AI is not configured, or the call or
 * its answer fails: an upload never waits on, or fails because of, the model.
 */
export async function checkUpload(
  input: { columnDiff: ColumnDiff[]; issueCounts: Record<string, number> },
  ask: Ask = askModel,
  enabled = Boolean(env.AI_API_KEY && env.AI_MODEL),
): Promise<UploadAdvice | null> {
  const diff = input.columnDiff.filter((d) => d.missing.length || d.unexpected.length);
  const codes = Object.entries(input.issueCounts);
  if (!enabled || (diff.length === 0 && codes.length === 0)) return null;

  const prompt = [
    ...diff.map((d) => `Sheet ${d.sheet}: hilang [${d.missing.join('; ')}], tidak dikenal [${d.unexpected.join('; ')}]`),
    ...codes.map(([code, n]) => `Masalah ${code}: ${n}x`),
  ].join('\n');
  try {
    const json = /\{[\s\S]*\}/.exec(await ask(SYSTEM, prompt))?.[0];
    const parsed = advice.parse(JSON.parse(json ?? ''));
    // A reading must point at a column the profile is really missing; anything else is invented.
    const missing = new Set(diff.flatMap((d) => d.missing));
    return {
      columns: parsed.columns.map((c) => ({ ...c, readAs: c.readAs && missing.has(c.readAs) ? c.readAs : null })),
      issues: parsed.issues.filter((i) => i.code in input.issueCounts),
    };
  } catch {
    return null;
  }
}
