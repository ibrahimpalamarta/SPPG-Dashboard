"use client";

import { Check } from "lucide-react";
import { useState, useTransition, type ReactNode } from "react";
import { useT } from "@/components/i18n-provider";
import { resolveIssues } from "@/app/(app)/mapping-validasi/actions";
import { Badge } from "@/components/ui/badge";
import { severityMeta, tabs, type Finding, type Severity } from "@/lib/mapping-validasi";

// Tabs that list findings, mapped to the severities they show; the other tabs render a panel.
const tabSeverities: Partial<Record<string, Severity[]>> = {
  [tabs[0]]: ["blocker", "check"],
  [tabs[2]]: ["auto"],
};

const inTab = (findings: Finding[], tabName: string) => findings.filter((f) => tabSeverities[tabName]?.includes(f.severity));

/** Closes every open issue of one code with a mandatory note; the page re-renders from the server afterwards. */
function ResolveForm({ batchId, code }: { batchId: string; code: string }) {
  const t = useT();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => setError(await resolveIssues(batchId, code, note)));
      }}
      className="space-y-3"
    >
      <label className="block text-sm font-semibold text-slate-900">
        {t("Catatan")}
        <textarea
          required
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("Contoh: sudah dikonfirmasi ke dapur, baris ini memang subtotal")}
          className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-800 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="flex justify-end">
        <button
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
        >
          <Check className="size-4" aria-hidden="true" />
          {pending ? t("Menyimpan…") : t("Tandai sudah dicek")}
        </button>
      </div>
    </form>
  );
}

export function FindingsPanel({
  findings,
  panels,
  batchId,
  canResolve,
}: {
  findings: Finding[];
  panels: Partial<Record<string, ReactNode>>;
  batchId: string;
  /** Data Operasional while the batch is still NEEDS_REVIEW. */
  canResolve: boolean;
}) {
  const t = useT();
  const [tab, setTab] = useState(tabs[0]);
  const [selectedId, setSelectedId] = useState(findings[0]?.id);

  const visible = inTab(findings, tab);
  const selected = visible.find((f) => f.id === selectedId) ?? visible[0];
  const panel = tabSeverities[tab] ? null : panels[tab];

  return (
    <div>
      <div role="tablist" className="flex gap-6 overflow-x-auto border-b border-slate-200 px-6">
        {tabs.map((name) => (
          <button
            key={name}
            role="tab"
            aria-selected={tab === name}
            onClick={() => setTab(name)}
            className={`-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium ${tab === name ? "border-emerald-600 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            {t(name)}
            {tabSeverities[name] && <span className="rounded-full bg-slate-100 px-2 text-xs text-slate-600">{inTab(findings, name).length}</span>}
          </button>
        ))}
      </div>

      {panel ? (
        panel
      ) : !selected ? (
        <p className="py-16 text-center text-sm text-slate-500">{tabSeverities[tab] ? t("Tidak ada temuan.") : t("Tab “{tab}” belum tersedia.", { tab: t(tab) })}</p>
      ) : (
        <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <ul className="divide-y divide-slate-100">
            {visible.map((f) => {
              const m = severityMeta[f.severity];
              return (
                <li key={f.id}>
                  <button
                    onClick={() => setSelectedId(f.id)}
                    aria-current={selected.id === f.id}
                    className={`flex w-full items-start justify-between gap-3 px-6 py-4 text-left ${selected.id === f.id ? "bg-emerald-50/60" : "hover:bg-slate-50"}`}
                  >
                    <span>
                      <span className="block font-semibold text-slate-900">{f.title}</span>
                      <span className="mt-1 block text-sm text-slate-500">{f.section}</span>
                    </span>
                    {f.resolvedNote != null ? <Badge tone="green">{t("Sudah dicek")}</Badge> : <Badge tone={m.tone}>{t(m.statusLabel)}</Badge>}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="space-y-5 border-t border-slate-200 p-6 lg:border-l lg:border-t-0">
            <h2 className="text-lg font-bold text-slate-900">{selected.title}</h2>
            <dl className="grid grid-cols-[8rem_1fr] gap-y-2 text-sm">
              <dt className="text-slate-500">{t("Bagian file")}</dt>
              <dd className="font-medium text-slate-900">{selected.section}</dd>
              <dt className="text-slate-500">{t("Baris")}</dt>
              <dd className="font-medium text-slate-900">{selected.rows}</dd>
            </dl>
            <p className="text-sm text-slate-700">{selected.description}</p>
            {selected.details && (
              <ul className="max-h-80 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
                {selected.details.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            )}

            {selected.resolvedNote != null ? (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                <span className="font-semibold">{t("Sudah dicek.")}</span> {selected.resolvedNote}
              </p>
            ) : (
              selected.code && canResolve && <ResolveForm key={selected.id} batchId={batchId} code={selected.code} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
