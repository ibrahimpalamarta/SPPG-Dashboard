import { Eye, FileText, Layers, Send, Check } from "lucide-react";
import { Badge, type Tone } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SelectButton } from "@/components/ui/select-button";
import { type UploadStatus, uploads } from "@/lib/mock/unggah-data";

const statuses: Record<UploadStatus, { label: string; tone: Tone; icon: typeof Check }> = {
  "pending-pm": { label: "Menunggu dicek PM", tone: "violet", icon: Send },
  "in-review": { label: "Belum selesai dicek", tone: "violet", icon: Eye },
  published: { label: "Sudah dipublish", tone: "green", icon: Check },
  replaced: { label: "Diganti versi baru", tone: "slate", icon: Layers },
};

export function UploadHistory() {
  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Upload History</h2>
        <SelectButton label="Semua status" />
      </div>
      <Card className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[56rem] text-left">
          <thead className="border-b border-slate-200 bg-slate-50 text-sm text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">File</th>
              <th className="px-4 py-3 font-medium">Kitchen</th>
              <th className="px-4 py-3 font-medium">Jenis data</th>
              <th className="px-4 py-3 font-medium">Diunggah oleh</th>
              <th className="px-4 py-3 font-medium">Waktu</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {uploads.map(({ file, code, kitchen, type, uploader, time, status }) => {
              const { label, tone, icon: Icon } = statuses[status];
              return (
                <tr key={code}>
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <FileText className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden="true" />
                      <div>
                        <p className="font-semibold text-slate-800">{file}</p>
                        <p className="font-mono text-xs text-slate-400">{code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{kitchen}</td>
                  <td className="px-4 py-3 text-slate-700">{type}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-slate-700">
                      <span className={`flex size-6 items-center justify-center rounded-full text-[10px] font-semibold text-white ${uploader.color}`} aria-hidden="true">{uploader.initials}</span>
                      {uploader.name}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">{time}</td>
                  <td className="px-4 py-3">
                    <Badge tone={tone}>
                      <span className="inline-flex items-center gap-1.5">
                        <Icon className="size-3.5" aria-hidden="true" />
                        {label}
                      </span>
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 hover:border-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600">Buka</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </section>
  );
}
