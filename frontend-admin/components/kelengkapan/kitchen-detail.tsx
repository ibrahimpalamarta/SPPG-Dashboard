import { ArrowRight, Bell, Building2, Send } from "lucide-react";
import { StatusLabel } from "@/components/kelengkapan/status-label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { deliveries, detail } from "@/lib/mock/kelengkapan-data";

const actionButton =
  "inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600";

const iconButton =
  "inline-flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600";

export function KitchenDetail() {
  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-3 text-base font-semibold text-slate-900">
          <Building2 className="size-5 text-emerald-600" aria-hidden="true" />
          Detail Sukun
        </h2>
        <button className={actionButton}>
          <Bell className="size-4" aria-hidden="true" />
          Ingatkan semua yang belum masuk
        </button>
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Jenis data</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Masalah terbuka</th>
              <th className="px-4 py-3 font-medium">Terakhir disetujui</th>
              <th className="px-4 py-3 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {detail.map(({ icon: Icon, type, status, issue, approvedAt, action }) => (
              <tr key={type}>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-3 text-slate-800">
                    <Icon className="size-4 text-slate-400" aria-hidden="true" />
                    {type}
                  </span>
                </td>
                <td className="px-4 py-3"><StatusLabel tone={status.tone}>{status.label}</StatusLabel></td>
                <td className="px-4 py-3">{issue ? <Badge tone={issue.tone}>{issue.label}</Badge> : <span className="text-slate-400">Tidak ada</span>}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{approvedAt ?? "—"}</td>
                <td className="px-4 py-3">
                  {action === "Ingatkan" ? (
                    <button aria-label={`Ingatkan ${type}`} title="Ingatkan" className={iconButton}>
                      <Bell className="size-4" aria-hidden="true" />
                    </button>
                  ) : action === "Buka" ? (
                    <button className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600">
                      Buka
                      <ArrowRight className="size-3.5" aria-hidden="true" />
                    </button>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function SipgnStatus() {
  return (
    <Card className="p-6">
      <h2 className="flex items-center gap-3 text-base font-semibold text-slate-900">
        <Send className="size-5 text-emerald-600" aria-hidden="true" />
        Status kirim ke SIPGN/BGN
      </h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {deliveries.map(({ title, code, note, status }) => (
          <div key={title} className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold text-slate-800">{title}</p>
            </div>
            <p className="text-xs text-slate-500">Kitchen {code}</p>
            <p className="mt-2 text-sm text-slate-500">{note}</p>
            <div className="mt-3"><StatusLabel tone={status.tone}>{status.label}</StatusLabel></div>
          </div>
        ))}
      </div>
    </Card>
  );
}
