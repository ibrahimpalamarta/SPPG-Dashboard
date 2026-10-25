import { Card } from "@/components/ui/card";
import { stats } from "@/lib/mock/finance";

export function StatStrip() {
  return (
    <Card className="grid divide-y divide-slate-200 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
      {stats.map(({ icon: Icon, label, value, unit }) => (
        <div key={label} className="p-5">
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {value}
            {unit && <span className="ml-2 text-sm font-normal text-slate-500">{unit}</span>}
          </p>
        </div>
      ))}
    </Card>
  );
}
