"use client";

import { Check, Info, Sparkles, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { findings, severityMeta, tabs, type Severity } from "@/lib/mock/mapping-validasi";

const filters: { key: Severity | "all"; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "blocker", label: severityMeta.blocker.label },
  { key: "check", label: severityMeta.check.label },
  { key: "auto", label: severityMeta.auto.label },
];

const count = (key: Severity | "all") => (key === "all" ? findings.length : findings.filter((f) => f.severity === key).length);

function SeverityIcon({ severity }: { severity: Severity }) {
  const Icon = severity === "auto" ? Sparkles : TriangleAlert;
  return <Icon className="size-4" aria-hidden="true" />;
}

export function FindingsPanel() {
  const [tab, setTab] = useState(tabs[0]);
  const [filter, setFilter] = useState<Severity | "all">("all");
  const [selectedId, setSelectedId] = useState(findings[0].id);

  const visible = findings.filter((f) => filter === "all" || f.severity === filter);
  const selected = findings.find((f) => f.id === selectedId) ?? findings[0];
  const meta = severityMeta[selected.severity];

  return (
    <div>
      <div role="tablist" className="flex gap-6 overflow-x-auto border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium ${tab === t ? "border-emerald-600 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            {t}
            {t === tabs[0] && <span className="rounded-full bg-slate-100 px-2 text-xs text-slate-600">{count("check") + count("blocker")}</span>}
          </button>
        ))}
      </div>

      {tab !== tabs[0] ? (
        <p className="py-16 text-center text-sm text-slate-500">Tab “{tab}” belum tersedia.</p>
      ) : (
        <div className="mt-5 space-y-4">
          <div className="inline-flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
            {filters.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                aria-pressed={filter === key}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${filter === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                {label} <span className="text-slate-400">{count(key)}</span>
              </button>
            ))}
          </div>

          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
            <ul className="space-y-3">
              {visible.map((f) => {
                const m = severityMeta[f.severity];
                return (
                  <li key={f.id}>
                    <button
                      onClick={() => setSelectedId(f.id)}
                      aria-current={selected.id === f.id}
                      className={`relative w-full overflow-hidden rounded-xl border bg-white p-4 pl-5 text-left ${selected.id === f.id ? "border-emerald-500 ring-1 ring-emerald-500" : "border-slate-200 hover:border-emerald-300"}`}
                    >
                      <span className={`absolute inset-y-0 left-0 w-1 ${m.bar}`} aria-hidden="true" />
                      <span className="flex items-start justify-between gap-3">
                        <span className="flex items-center gap-2 text-xs font-bold uppercase text-slate-600">
                          <SeverityIcon severity={f.severity} />
                          {m.label}
                        </span>
                        <Badge tone={m.tone}>{m.statusLabel}</Badge>
                      </span>
                      <span className="mt-1 block font-semibold text-slate-900">{f.title}</span>
                      <span className="mt-1 block text-sm text-slate-500">{f.where}</span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <Card className="space-y-5 p-6">
              <div className="flex items-start justify-between gap-3">
                <p className="flex items-center gap-2 text-xs font-bold uppercase text-slate-600">
                  <SeverityIcon severity={selected.severity} />
                  {meta.label}
                  {selected.severity === "check" && " · cukup dicek lalu ditandai"}
                </p>
                <Badge tone={meta.tone}>{meta.statusLabel}</Badge>
              </div>
              <h2 className="text-lg font-bold text-slate-900">{selected.title}</h2>
              <dl className="grid grid-cols-[8rem_1fr] gap-y-2 text-sm">
                <dt className="text-slate-500">Bagian file</dt>
                <dd className="font-medium text-slate-900">{selected.section}</dd>
                <dt className="text-slate-500">Baris</dt>
                <dd className="font-medium text-slate-900">{selected.rows}</dd>
              </dl>
              <p className="text-sm text-slate-700">{selected.description}</p>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-96 text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-2 font-medium">Menu</th>
                      <th className="px-4 py-2 font-medium">Bahan</th>
                      <th className="px-4 py-2 font-medium">Nomor PO</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selected.sample.map((r) => (
                      <tr key={r.menu + r.bahan}>
                        <td className="px-4 py-2 text-slate-800">{r.menu}</td>
                        <td className="px-4 py-2 text-slate-800">{r.bahan}</td>
                        <td className="px-4 py-2 font-mono text-xs text-slate-600">{r.po}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                <Info className="size-4 shrink-0" aria-hidden="true" />
                <span>
                  <strong>Saran:</strong> {selected.suggestion}
                </span>
              </p>

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
                    <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:border-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600">
                      <Check className="size-4" aria-hidden="true" />
                      Tandai sudah dicek
                    </button>
                  </div>
                </>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
