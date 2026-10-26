import { CircleCheck, FileSpreadsheet, Send, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import { FindingsPanel } from "@/components/mapping/findings-panel";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SampleDataNote } from "@/components/ui/sample-data-note";
import { SelectButton } from "@/components/ui/select-button";
import { requirePage } from "@/lib/guard";
import { file, steps, summary } from "@/lib/mock/mapping-validasi";

export const metadata: Metadata = { title: "Mapping & Validasi · SPPG Internal" };

export default async function Page() {
  await requirePage("/mapping-validasi");
  const canSend = summary.blockers === 0 && summary.checks === 0;
  return (
    <div className="mx-auto max-w-400">
      <SampleDataNote />
      <Card className="space-y-6 p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Mapping & Validasi</h1>
          </div>
          <SelectButton label={`${file.name} · ${file.meta[0]} · ${file.status.label}`} />
        </div>

        <ol className="flex flex-wrap gap-3">
          {steps.map((s, i) => (
            <li key={s} className="flex items-center gap-3 rounded-full border border-slate-200 py-1.5 pl-1.5 pr-4 text-sm text-slate-700">
              <span className="grid size-6 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>

        <Card className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-4">
              <span className="grid size-11 place-items-center rounded-xl border border-slate-200 text-slate-500">
                <FileSpreadsheet className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-slate-900">{file.name}</h2>
                <p className="text-sm text-slate-500">
                  {file.meta.join(" · ")} · <span className="font-mono text-xs">{file.uploadId}</span>
                </p>
              </div>
            </div>
            <Badge tone={file.status.tone}>{file.status.label}</Badge>
          </div>
          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-slate-500">Format file</dt>
              <dd className="mt-1 font-medium text-slate-900">{file.format}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Jumlah baris</dt>
              <dd className="mt-1 font-medium text-slate-900">{file.rowCount}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Diunggah oleh</dt>
              <dd className="mt-1 font-medium text-slate-900">
                {file.uploadedBy} · {file.uploadedAt}
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-semibold">
            <li className={`flex items-center gap-2 ${summary.blockers ? "text-red-600" : "text-emerald-600"}`}>
              <CircleCheck className="size-4" aria-hidden="true" />
              {summary.blockers ? `${summary.blockers} wajib diperbaiki` : "Tidak ada yang wajib diperbaiki"}
            </li>
            <li className="flex items-center gap-2 text-amber-600">
              <TriangleAlert className="size-4" aria-hidden="true" />
              {summary.checks} perlu dicek
            </li>
            <li className="flex items-center gap-2 text-emerald-600">
              <CircleCheck className="size-4" aria-hidden="true" />
              {summary.formatMatch ? "Format file cocok" : "Format file tidak cocok"}
            </li>
          </ul>
          <button
            disabled={!canSend}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
          >
            <Send className="size-4" aria-hidden="true" />
            Kirim ke PM
          </button>
        </Card>

        <FindingsPanel />
      </Card>
    </div>
  );
}
