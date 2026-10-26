import { Utensils } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SourceLink } from "@/components/ui/source-link";
import { topMenus } from "@/lib/mock/menu-gizi";

const maxDays = Math.max(...topMenus.map(({ days }) => days));

export function TopMenu() {
  return (
    <Card className="flex flex-col p-6">
      <h3 className="flex items-center gap-3 text-base font-semibold text-slate-900">
        <Utensils className="size-5 text-emerald-600" aria-hidden="true" />
        Top 5 Menu
      </h3>
      <ol className="mt-6 flex flex-col gap-4">
        {topMenus.map(({ name, kitchens, days }, index) => (
          <li key={name} className="grid grid-cols-[20px_1fr_auto] items-center gap-3">
            <span className="text-sm text-slate-500">{index + 1}</span>
            <div>
              <p className="mb-1.5 text-sm font-medium text-slate-800">
                {name} <span className="font-normal text-slate-400">· {kitchens}</span>
              </p>
              <div className="h-2 overflow-hidden rounded-full bg-emerald-50">
                <div className="grow-x h-full rounded-full bg-emerald-500" style={{ width: `${(days / maxDays) * 100}%` }} />
              </div>
            </div>
            <strong className="text-sm text-slate-800">{days} hari</strong>
          </li>
        ))}
      </ol>
      <div className="mt-auto flex justify-end border-t border-slate-100 pt-4">
        <SourceLink />
      </div>
    </Card>
  );
}
