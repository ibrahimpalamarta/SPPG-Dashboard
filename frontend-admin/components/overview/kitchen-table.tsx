import { HeartPulse } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { completenessColor, dateLabel, type KitchenCompleteness } from "@/lib/kpi";

const shortDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });

export function KitchenTable({ kitchens }: { kitchens: KitchenCompleteness[] }) {
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
            {kitchens.map(({ name, region, percent, issues, lastPublish }) => (
              <tr key={name}>
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-800">{name}</p>
                  {region && <p className="text-xs text-slate-500">{region}</p>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                      <div className={`grow-x h-full rounded-full ${completenessColor(percent).bar}`} style={{ width: `${percent}%` }} />
                    </div>
                    <span className="font-semibold text-slate-800">{percent}%</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {issues.fix ? (
                    <Badge tone="red">{issues.fix} wajib diperbaiki</Badge>
                  ) : issues.review ? (
                    <Badge tone="amber">{issues.review} perlu dicek</Badge>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500" title={lastPublish ? dateLabel(lastPublish.at) : undefined}>
                  {lastPublish ? `${shortDate(lastPublish.at)} · ${lastPublish.label}` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
