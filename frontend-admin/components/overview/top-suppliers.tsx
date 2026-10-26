import { BarChart3 } from "lucide-react";
import { Panel } from "@/components/overview/panel";
import { suppliers } from "@/lib/mock/overview";

export function TopSuppliers() {
  return (
    <Panel title="Top 5 Supplier" icon={BarChart3}>
      <div className="flex flex-col gap-5">
        {suppliers.map(({ name, amount, progress }, index) => (
          <div key={name} className="grid grid-cols-[24px_1fr_auto] items-center gap-3">
            <span className="text-sm text-slate-500">{index + 1}</span>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">{name}</p>
              <div className="h-2 overflow-hidden rounded-full bg-emerald-50">
                <div className="grow-x h-full rounded-full bg-emerald-500" style={{ width: `${progress}%`, animationDelay: `${index * 80}ms` }} />
              </div>
            </div>
            <strong className="text-sm text-slate-700">{amount}</strong>
          </div>
        ))}
      </div>
    </Panel>
  );
}
