import { HeartPulse } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { kitchens } from "@/lib/mock/kelengkapan";

export function KitchenTable() {
  return (
    <Card className="p-6">
      <h3 className="flex items-center gap-3 text-base font-semibold text-slate-900">
        <HeartPulse className="size-5 text-emerald-600" aria-hidden="true" />
        Kelengkapan Data per Kitchen
      </h3>
      <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[40rem] text-left">
          <thead className="bg-slate-50 text-sm text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Kitchen</th>
              <th className="px-4 py-3 font-medium">Kelengkapan</th>
              <th className="px-4 py-3 font-medium">Masalah terbuka</th>
              <th className="px-4 py-3 font-medium">Publish terakhir</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {kitchens.map(({ code, name, note, completeness, phase, issue, lastPublish }) => (
              <tr key={code}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{code}</span>
                    <div>
                      <p className="font-semibold text-slate-800">{name}</p>
                      <p className="text-xs text-slate-500">{note}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {completeness === undefined ? (
                    <Badge tone="slate">{phase}</Badge>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-emerald-50">
                        <div className="grow-x h-full rounded-full bg-emerald-500" style={{ width: `${completeness}%` }} />
                      </div>
                      <span className="font-semibold text-slate-800">{completeness}%</span>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">{issue ? <Badge tone={issue.tone}>{issue.label}</Badge> : <span className="text-slate-400">—</span>}</td>
                <td className="px-4 py-3 text-slate-500">{lastPublish ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
