"use client";

import { Check } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { severityMeta, tabs, type Finding, type Severity } from "@/lib/mapping-validasi";

// Tabs that list findings, mapped to the severities they show; the other tabs render a panel.
const tabSeverities: Partial<Record<string, Severity[]>> = {
  [tabs[0]]: ["blocker", "check"],
  [tabs[2]]: ["auto"],
};

const inTab = (findings: Finding[], t: string) => findings.filter((f) => tabSeverities[t]?.includes(f.severity));

export function FindingsPanel({ findings, panels }: { findings: Finding[]; panels: Partial<Record<string, ReactNode>> }) {
  const [tab, setTab] = useState(tabs[0]);
  const [selectedId, setSelectedId] = useState(findings[0]?.id);

  const visible = inTab(findings, tab);
  const selected = visible.find((f) => f.id === selectedId) ?? visible[0];
  const panel = tabSeverities[tab] ? null : panels[tab];

  return (
    <div>
      <div role="tablist" className="flex gap-6 overflow-x-auto border-b border-slate-200 px-6">
        {tabs.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium ${tab === t ? "border-emerald-600 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            {t}
            {tabSeverities[t] && <span className="rounded-full bg-slate-100 px-2 text-xs text-slate-600">{inTab(findings, t).length}</span>}
          </button>
        ))}
      </div>

      {panel ? (
        panel
      ) : !selected ? (
        <p className="py-16 text-center text-sm text-slate-500">{tabSeverities[tab] ? "Tidak ada temuan." : `Tab “${tab}” belum tersedia.`}</p>
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
                    <Badge tone={m.tone}>{m.statusLabel}</Badge>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="space-y-5 border-t border-slate-200 p-6 lg:border-l lg:border-t-0">
            <h2 className="text-lg font-bold text-slate-900">{selected.title}</h2>
            <dl className="grid grid-cols-[8rem_1fr] gap-y-2 text-sm">
              <dt className="text-slate-500">Bagian file</dt>
              <dd className="font-medium text-slate-900">{selected.section}</dd>
              <dt className="text-slate-500">Baris</dt>
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

            {selected.severity === "check" && (
              <>
                <label className="block text-sm font-semibold text-slate-900">
                  Catatan (opsional)
                  <textarea
                    rows={3}
                    placeholder="Contoh: sudah dikonfirmasi ke dapur"
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-800 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                  />
                </label>
                <div className="flex justify-end">
                  <button className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2">
                    <Check className="size-4" aria-hidden="true" />
                    Tandai sudah dicek
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
