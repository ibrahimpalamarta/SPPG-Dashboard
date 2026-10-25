/**
 * Stage 6, and the only place gate rules are applied. Reads reports/raw/*,
 * gate.json, requirements.json and the OUTCOME_* stage statuses, then writes
 * reports/verdict.json, scorecard.html and pr-comment.md.
 *
 *   merge-report               full report; exits 1 when the verdict is not pass (unless ENFORCE=0)
 *   merge-report --stage=code  fail-fast check after stage 1; exits 1 on a code Blocker
 */
import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { QA, RAW, REPO, REPORTS, writeJson } from './lib.js';

export type Severity = 'Blocker' | 'Warning' | 'Info';
export type Finding = { severity: Severity; tool: string; rule: string; location?: string; message: string; waived?: string };
export type TestStatus = 'passed' | 'failed' | 'flaky' | 'fixme' | 'skipped' | 'notrun';
export type TestCase = { title: string; ids: string[]; tags: string[]; status: TestStatus; source: 'vitest' | 'playwright' };
export type ReqStatus = 'Lulus' | 'Gagal' | 'Belum ada test' | 'Menunggu keputusan' | 'Menunggu fitur' | 'Tidak dijalankan';
export type Requirement = { source: string; id: string; title: string; ac: string; priority: string; target: string | null; refs: string[] };
export type Waiver = { match: string; reason?: string; owner?: string; expires?: string };
type SeverityMap = Record<string, Severity>;
export type Gate = {
  severity: {
    tsc: Severity;
    eslint: SeverityMap;
    eslintA11yInactive: Severity;
    semgrep: SeverityMap;
    gitleaks: Severity;
    vitest: { failed: Severity };
    playwright: { failed: Severity; flaky: Severity };
    playwrightBlockerTags: string[];
    toolMissingInCI: Severity;
    stageFailedWithoutReport: Severity;
    pendingFeaturePastTarget: Severity;
    noTestPastTarget: Severity;
  };
  unwaivable: string[];
  waivers: Waiver[];
};

export const STAGES = { ci: 'CI build', code: 'Code audit', logic: 'Logic test', env: 'Environment', e2e: 'Feature E2E', ui: 'UI/UX', report: 'Laporan & gate' } as const;
export type Stage = keyof typeof STAGES;
const TOOL_STAGE: Record<string, Stage> = { ci: 'ci', tsc: 'code', eslint: 'code', semgrep: 'code', gitleaks: 'code', vitest: 'logic', playwright: 'e2e' };
const RANK: Record<Severity, number> = { Blocker: 0, Warning: 1, Info: 2 };

const ids = (title: string) => [...title.matchAll(/\[([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+)\]/g)].map((m) => m[1]!);

// ---------------------------------------------------------------------------
// Collectors: raw tool output -> findings + test cases. No gate decisions here
// beyond looking up the severity a tool's own level maps to.
// ---------------------------------------------------------------------------

type SarifRule = { id: string; defaultConfiguration?: { level?: string }; properties?: { tags?: string[] } };
type Sarif = {
  runs?: {
    tool?: { driver?: { rules?: SarifRule[] } };
    results?: { ruleId?: string; level?: string; message?: { text?: string }; locations?: { physicalLocation?: { artifactLocation?: { uri?: string }; region?: { startLine?: number } } }[] }[];
  }[];
};

function sarif(tool: string, doc: Sarif, severityOf: (level: string, tags: string[]) => Severity): Finding[] {
  return (doc.runs ?? []).flatMap((r) => {
    const rules = new Map((r.tool?.driver?.rules ?? []).map((x) => [x.id, x]));
    return (r.results ?? []).map((x) => {
      const loc = x.locations?.[0]?.physicalLocation;
      const uri = loc?.artifactLocation?.uri;
      const rule = rules.get(x.ruleId ?? '');
      return {
        // SARIF: a result without its own level inherits the rule's (Semgrep never sets it per result).
        severity: severityOf(x.level ?? rule?.defaultConfiguration?.level ?? 'warning', rule?.properties?.tags ?? []),
        tool,
        rule: x.ruleId ?? 'unknown',
        // Semgrep writes absolute runner paths; repo-relative keeps waivers and the comment portable.
        location: uri ? `${(isAbsolute(uri) ? relative(REPO, uri) : uri).replaceAll('\\', '/')}:${loc?.region?.startLine ?? 0}` : undefined,
        message: x.message?.text ?? '',
      };
    });
  });
}

type PwSpec = { title: string; tags?: string[]; tests: { projectName: string; status: string; annotations?: { type: string }[] }[] };
type PwSuite = { title: string; file?: string; specs?: PwSpec[]; suites?: PwSuite[] };

function* pwTests(suites: PwSuite[] = [], path: string[] = []): Generator<{ title: string; spec: PwSpec; test: PwSpec['tests'][number] }> {
  for (const s of suites) {
    const here = s.file === s.title ? path : [...path, s.title];
    for (const spec of s.specs ?? []) for (const test of spec.tests) yield { title: [...here, spec.title].join(' › '), spec, test };
    yield* pwTests(s.suites, here);
  }
}

export function collect(read: (name: string) => unknown, files: string[], gate: Gate, ci: boolean): { findings: Finding[]; tests: TestCase[] } {
  const g = gate.severity;
  const findings: Finding[] = [];
  const tests: TestCase[] = [];

  for (const f of files.filter((n) => /^tsc-.*\.json$/.test(n))) {
    const { exitCode, output, prepareFailed } = read(f) as { exitCode: number; output: string; prepareFailed?: string };
    if (prepareFailed) findings.push({ severity: 'Warning', tool: 'tsc', rule: 'generate-failed', location: f, message: prepareFailed.slice(0, 800) });
    if (exitCode === 0) continue;
    const errors = [...output.matchAll(/^(.+?)\((\d+),\d+\): error (TS\d+): (.*)$/gm)];
    if (errors.length === 0) findings.push({ severity: g.tsc, tool: 'tsc', rule: 'tsc-failed', location: f, message: output.slice(0, 800) });
    for (const e of errors) findings.push({ severity: g.tsc, tool: 'tsc', rule: e[3]!, location: `${f.slice(4, -5)}/${e[1]}:${e[2]}`, message: e[4]! });
  }

  if (files.includes('eslint-frontend-admin.json')) {
    for (const file of read('eslint-frontend-admin.json') as { filePath: string; messages: { ruleId: string | null; severity: number; message: string; line?: number }[] }[]) {
      for (const m of file.messages) {
        findings.push({
          severity: g.eslint[m.severity === 2 ? 'error' : 'warning'] ?? 'Info',
          tool: 'eslint',
          rule: m.ruleId ?? 'parse',
          location: `${relative(REPO, file.filePath).replaceAll('\\', '/')}:${m.line ?? 0}`,
          message: m.message,
        });
      }
    }
  }
  if (files.includes('eslint-a11y-rules.json') && (read('eslint-a11y-rules.json') as { rules: string[] }).rules.length === 0) {
    findings.push({ severity: g.eslintA11yInactive, tool: 'eslint', rule: 'jsx-a11y-inactive', message: 'Tidak ada rule jsx-a11y aktif di config ESLint frontend-admin.' });
  }

  // A rule tagged `security` is at least g.semgrep.security, whatever its level (QD-31).
  const semgrepSeverity = (l: string, tags: string[]): Severity => {
    const byLevel = g.semgrep[l] ?? 'Warning';
    const security = tags.includes('security') ? g.semgrep.security : undefined;
    return security && RANK[security] < RANK[byLevel] ? security : byLevel;
  };
  if (files.includes('semgrep.sarif')) findings.push(...sarif('semgrep', read('semgrep.sarif') as Sarif, semgrepSeverity));
  if (files.includes('gitleaks.sarif')) findings.push(...sarif('gitleaks', read('gitleaks.sarif') as Sarif, () => g.gitleaks));

  // A tool that did not run is Info on a laptop, but in CI it means the
  // pipeline itself is broken: that is an infra failure, never a pass.
  for (const f of files.filter((n) => /\.(skipped|error)\.json$/.test(n))) {
    const [tool, kind] = f.split('.') as [string, string];
    const { reason, output } = read(f) as { reason?: string; output?: string };
    findings.push({
      severity: ci ? g.toolMissingInCI : kind === 'skipped' ? 'Info' : 'Warning',
      tool: 'infra',
      rule: `${tool}-${kind}`,
      message: reason ?? (output ?? '').slice(0, 800),
    });
  }

  if (files.includes('vitest.json')) {
    const doc = read('vitest.json') as { testResults: { name: string; assertionResults: { fullName: string; title: string; status: string; failureMessages: string[] }[] }[] };
    for (const file of doc.testResults) {
      for (const a of file.assertionResults) {
        const status: TestStatus = a.status === 'passed' ? 'passed' : a.status === 'failed' ? 'failed' : a.status === 'todo' ? 'fixme' : 'skipped';
        tests.push({ title: a.fullName, ids: ids(a.title), tags: [], status, source: 'vitest' });
        if (status === 'failed') {
          findings.push({ severity: g.vitest.failed, tool: 'vitest', rule: 'test-failed', location: relative(REPO, file.name).replaceAll('\\', '/'), message: `${a.fullName}: ${(a.failureMessages[0] ?? '').split('\n')[0]}` });
        }
      }
    }
  }

  const ran = new Set<string>();
  if (files.includes('playwright.json')) {
    const doc = read('playwright.json') as { suites: PwSuite[]; errors?: { message?: string }[] };
    for (const e of doc.errors ?? []) findings.push({ severity: g.stageFailedWithoutReport, tool: 'playwright', rule: 'run-error', message: (e.message ?? '').slice(0, 800) });
    for (const { title, spec, test } of pwTests(doc.suites)) {
      const tags = (spec.tags ?? []).map((t) => t.replace(/^@/, ''));
      const fixme = test.annotations?.some((a) => a.type === 'fixme') ?? false;
      const status: TestStatus =
        test.status === 'expected' ? 'passed' : test.status === 'unexpected' ? 'failed' : test.status === 'flaky' ? 'flaky' : fixme ? 'fixme' : 'skipped';
      ran.add(`${test.projectName}|${title}`);
      if (test.projectName !== 'setup') tests.push({ title, ids: ids(title), tags, status, source: 'playwright' });
      // A failed login setup skips every test behind it, so it counts as a Blocker tag.
      const blocking = test.projectName === 'setup' || tags.some((t) => g.playwrightBlockerTags.includes(t));
      if (status === 'failed') findings.push({ severity: blocking ? 'Blocker' : g.playwright.failed, tool: 'playwright', rule: 'test-failed', message: title });
      if (status === 'flaky') findings.push({ severity: g.playwright.flaky, tool: 'playwright', rule: 'test-flaky', message: title });
    }
  }
  if (files.includes('playwright-list.json')) {
    for (const { title, spec, test } of pwTests((read('playwright-list.json') as { suites: PwSuite[] }).suites)) {
      if (test.projectName === 'setup' || ran.has(`${test.projectName}|${title}`)) continue;
      tests.push({ title, ids: ids(title), tags: (spec.tags ?? []).map((t) => t.replace(/^@/, '')), status: 'notrun', source: 'playwright' });
    }
  }
  return { findings, tests };
}

// ---------------------------------------------------------------------------
// Gate: pure, so tests/logic/gate.test.ts can pin every rule.
// ---------------------------------------------------------------------------

export type Outcomes = Partial<Record<Exclude<Stage, 'report'>, string>>;
export type Evaluation = {
  verdict: 'pass' | 'fail' | 'infra-error';
  findings: Finding[];
  requirements: (Requirement & { status: ReqStatus; tests: string[] })[];
  pending: string[];
};

export function requirementStatus(req: Requirement, tests: TestCase[]): ReqStatus {
  if (req.priority === 'decision') return 'Menunggu keputusan';
  const mine = tests.filter((t) => t.ids.includes(req.id));
  if (mine.length === 0) return 'Belum ada test';
  if (mine.some((t) => t.status === 'failed')) return 'Gagal';
  const fixme = mine.filter((t) => t.status === 'fixme');
  if (fixme.length > 0) return fixme.some((t) => t.ids.some((i) => i.startsWith('OD-'))) ? 'Menunggu keputusan' : 'Menunggu fitur';
  if (mine.some((t) => t.status === 'passed' || t.status === 'flaky')) return 'Lulus';
  return 'Tidak dijalankan';
}

export function evaluate(input: { gate: Gate; requirements: Requirement[]; findings: Finding[]; tests: TestCase[]; outcomes: Outcomes; today: string }): Evaluation {
  const { gate, today } = input;
  const g = gate.severity;
  const findings = input.findings.map((f) => ({ ...f }));

  // A stage that failed but left no finding behind would otherwise read as clean.
  // CI build writes no raw report; its failure is a red build/test, so a product failure, not infra.
  for (const [stage, outcome] of Object.entries(input.outcomes) as [Stage, string][]) {
    if (stage === 'env' || outcome !== 'failure') continue;
    if (!findings.some((f) => TOOL_STAGE[f.tool] === stage && f.severity === 'Blocker')) {
      findings.push({ severity: g.stageFailedWithoutReport, tool: stage === 'ci' ? 'ci' : 'infra', rule: `${stage}-failed`, message: `Tahap ${STAGES[stage]} gagal tanpa laporan yang menjelaskan.` });
    }
  }

  const requirements = input.requirements.map((r) => {
    const status = requirementStatus(r, input.tests);
    const late = r.priority === 'P0' && r.target !== null && today > r.target;
    if (late && status === 'Menunggu fitur') findings.push({ severity: g.pendingFeaturePastTarget, tool: 'requirements', rule: 'pending-past-target', location: r.id, message: `${r.id} masih fixme setelah target ${r.target}.` });
    if (late && status === 'Belum ada test') findings.push({ severity: g.noTestPastTarget, tool: 'requirements', rule: 'no-test-past-target', location: r.id, message: `${r.id} belum punya test setelah target ${r.target}.` });
    return { ...r, status, tests: input.tests.filter((t) => t.ids.includes(r.id)).map((t) => `${t.title} (${t.status})`) };
  });

  for (const w of gate.waivers) {
    if (!w.reason || !w.owner || !w.expires) {
      findings.push({ severity: 'Blocker', tool: 'gate', rule: 'waiver-invalid', location: w.match, message: 'Waiver wajib punya reason, owner, dan expires.' });
      continue;
    }
    for (const f of findings) {
      if (f.waived || !`${f.tool}:${f.rule}:${f.location ?? ''}`.startsWith(w.match)) continue;
      if (gate.unwaivable.includes(f.tool)) {
        findings.push({ severity: 'Blocker', tool: 'gate', rule: 'waiver-forbidden', location: w.match, message: `Temuan ${f.tool} tidak bisa di-waive.` });
      } else if (w.expires < today) {
        f.severity = 'Blocker';
        f.message = `${f.message} (waiver ${w.owner} kedaluwarsa ${w.expires})`;
      } else {
        f.waived = `${w.owner} s/d ${w.expires}: ${w.reason}`;
      }
    }
  }

  findings.sort((a, b) => RANK[a.severity] - RANK[b.severity] || a.tool.localeCompare(b.tool));
  const blockers = findings.filter((f) => f.severity === 'Blocker' && !f.waived);
  const infra = input.outcomes.env === 'failure' || Object.values(input.outcomes).includes('cancelled') || blockers.some((f) => f.tool === 'infra');
  return {
    verdict: infra ? 'infra-error' : blockers.length > 0 ? 'fail' : 'pass',
    findings,
    requirements,
    pending: requirements.filter((r) => r.status === 'Menunggu keputusan').map((r) => r.id),
  };
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const LABEL = { pass: 'LULUS — aman di-merge', fail: 'GAGAL — merge diblok', 'infra-error': 'MASALAH INFRA — bukan kegagalan produk' } as const;

function scorecard(v: Evaluation & { meta: Record<string, string>; stages: Record<string, string> }): string {
  const rows = (cells: string[][]) => cells.map((c) => `<tr>${c.map((x) => `<td>${x}</td>`).join('')}</tr>`).join('');
  const count = (s: Severity) => v.findings.filter((f) => f.severity === s && !f.waived).length;
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>QA Scorecard</title>
<style>body{font:14px system-ui,sans-serif;margin:24px;color:#111;background:#fff}table{border-collapse:collapse;width:100%;margin:8px 0 24px}td,th{border:1px solid #ddd;padding:6px 8px;text-align:left;vertical-align:top}th{background:#f4f4f5}
.pass{color:#166534}.fail{color:#b91c1c}.infra-error{color:#a16207}.Blocker{color:#b91c1c;font-weight:600}.Warning{color:#a16207}code{font-size:12px}</style></head><body>
<h1 class="${v.verdict}">${LABEL[v.verdict]}</h1>
<p>Trigger <b>${esc(v.meta.trigger!)}</b> · commit <code>${esc(v.meta.commit!)}</code> · durasi ${esc(v.meta.duration!)} · ${count('Blocker')} Blocker, ${count('Warning')} Warning, ${count('Info')} Info</p>
<p>${v.meta.runUrl ? `<a href="${esc(v.meta.runUrl)}">Run CI &amp; artifact</a> · ` : ''}<a href="playwright-report/index.html">Laporan Playwright</a></p>
<h2>Tahap</h2><table><tr><th>Tahap</th><th>Status</th><th>Blocker</th><th>Warning</th></tr>${rows(
    Object.entries(STAGES).map(([k, label]) => {
      const mine = v.findings.filter((f) => !f.waived && (TOOL_STAGE[f.tool] ?? 'report') === k);
      return [label, esc(v.stages[k] ?? '-'), String(mine.filter((f) => f.severity === 'Blocker').length), String(mine.filter((f) => f.severity === 'Warning').length)];
    }),
  )}</table>
<h2>Temuan</h2><table><tr><th>Severity</th><th>Tool</th><th>Rule</th><th>Lokasi</th><th>Pesan</th></tr>${rows(
    v.findings.map((f) => [`<span class="${f.severity}">${f.severity}${f.waived ? ' (waived)' : ''}</span>`, esc(f.tool), esc(f.rule), `<code>${esc(f.location ?? '')}</code>`, esc(f.message) + (f.waived ? `<br><i>${esc(f.waived)}</i>` : '')]),
  )}</table>
<h2>Bukti requirement</h2><table><tr><th>ID</th><th>Sumber</th><th>Judul</th><th>Target</th><th>Status</th><th>Test</th></tr>${rows(
    v.requirements.map((r) => [esc(r.id), esc(r.source), esc(r.title), esc(r.target ?? '-'), esc(r.status), r.tests.map(esc).join('<br>')]),
  )}</table></body></html>`;
}

function prComment(v: Evaluation & { meta: Record<string, string>; stages: Record<string, string> }): string {
  const blockers = v.findings.filter((f) => f.severity === 'Blocker' && !f.waived);
  const byStatus = new Map<string, number>();
  for (const r of v.requirements) byStatus.set(r.status, (byStatus.get(r.status) ?? 0) + 1);
  return [
    '<!-- qa-audit -->',
    `## qa-audit: ${LABEL[v.verdict]}`,
    `Commit \`${v.meta.commit}\` · ${v.meta.duration}${v.meta.runUrl ? ` · [scorecard & artifact](${v.meta.runUrl})` : ''}`,
    '',
    '| Tahap | Status |',
    '|---|---|',
    ...Object.entries(STAGES).map(([k, label]) => `| ${label} | ${v.stages[k] ?? '-'} |`),
    '',
    blockers.length === 0 ? 'Tidak ada Blocker.' : `### Blocker (${blockers.length})`,
    ...blockers.slice(0, 20).map((f) => `- **${f.tool}** \`${f.rule}\` ${f.location ? `\`${f.location}\` ` : ''}— ${f.message.split('\n')[0]}`),
    blockers.length > 20 ? `- … ${blockers.length - 20} lainnya di scorecard` : '',
    '',
    `Requirement: ${[...byStatus].map(([s, n]) => `${s} ${n}`).join(' · ')}`,
    v.pending.length ? `Menunggu keputusan: ${v.pending.join(', ')}` : '',
  ]
    .filter((l, i, a) => l !== '' || a[i - 1] !== '')
    .join('\n');
}

function main() {
  const gate = JSON.parse(readFileSync(join(QA, 'gate.json'), 'utf8')) as Gate;
  const { requirements } = JSON.parse(readFileSync(join(QA, 'requirements.json'), 'utf8')) as { requirements: Requirement[] };
  const files = existsSync(RAW) ? readdirSync(RAW) : [];
  const read = (name: string): unknown => JSON.parse(readFileSync(join(RAW, name), 'utf8'));
  const ci = !!process.env.CI;
  const { findings, tests } = collect(read, files, gate, ci);
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });

  if (process.argv.includes('--stage=code')) {
    const v = evaluate({ gate, requirements: [], findings: findings.filter((f) => TOOL_STAGE[f.tool] === 'code' || f.tool === 'infra'), tests: [], outcomes: {}, today });
    const blockers = v.findings.filter((f) => f.severity === 'Blocker' && !f.waived);
    for (const f of blockers) console.error(`Blocker ${f.tool} ${f.rule} ${f.location ?? ''} ${f.message.split('\n')[0]}`);
    console.log(blockers.length ? `code audit: ${blockers.length} Blocker, tahap 2-5 dilewati` : 'code audit: tidak ada Blocker');
    process.exit(blockers.length ? 1 : 0);
  }

  const outcomes: Outcomes = {};
  for (const s of ['ci', 'code', 'logic', 'env', 'e2e', 'ui'] as const) {
    const o = process.env[`OUTCOME_${s.toUpperCase()}`];
    if (o) outcomes[s] = o;
  }
  const v = evaluate({ gate, requirements, findings, tests, outcomes, today });
  const started = Number(process.env.QA_STARTED_AT ?? Date.now());
  const commit = process.env.GITHUB_SHA ?? execSync('git rev-parse HEAD', { cwd: REPO, encoding: 'utf8' }).trim();
  const runUrl = process.env.GITHUB_RUN_ID ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}` : '';
  const meta = { trigger: process.env.QA_TRIGGER ?? 'local', commit: commit.slice(0, 12), duration: `${Math.round((Date.now() - started) / 1000)} dtk`, runUrl };
  const stages = { ...outcomes, report: 'success' };

  writeJson(join(REPORTS, 'verdict.json'), { verdict: v.verdict, trigger: meta.trigger, commit, durationMs: Date.now() - started, stages, findings: v.findings, pending: v.pending, requirements: v.requirements.map((r) => ({ id: r.id, source: r.source, status: r.status, tests: r.tests })) });
  writeFileSync(join(REPORTS, 'scorecard.html'), scorecard({ ...v, meta, stages }));
  writeFileSync(join(REPORTS, 'pr-comment.md'), prComment({ ...v, meta, stages }));
  console.log(`verdict: ${v.verdict} (${v.findings.filter((f) => f.severity === 'Blocker' && !f.waived).length} Blocker) -> ${relative(REPO, REPORTS)}/scorecard.html`);
  if (process.env.ENFORCE !== '0' && v.verdict !== 'pass') process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
