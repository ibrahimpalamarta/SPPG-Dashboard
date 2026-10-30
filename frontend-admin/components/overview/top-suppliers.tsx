import { BarChart3 } from "lucide-react";
import { Panel } from "@/components/overview/panel";
import { rp, type FinanceKpi } from "@/lib/kpi";

/** SCRUM-97: Σ item lines per supplier, external spend only. */
export function TopSuppliers({ suppliers }: { suppliers: FinanceKpi["topSuppliers"] }) {
  const max = suppliers[0]?.amount ?? 0;
  return (
    <Panel title="Top 5 Supplier" icon={BarChart3}>
      {suppliers.length === 0 ? (
        <p className="text-sm text-slate-500">Belum ada data belanja yang dipublish.</p>
      ) : (
        <div className="flex flex-col gap-5">
          {suppliers.map(({ name, amount }, index) => (
            <div key={name} className="grid grid-cols-[24px_1fr_auto] items-center gap-3">
              <span className="text-sm text-slate-500">{index + 1}</span>
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">{name}</p>
                <div className="h-2 overflow-hidden rounded-full bg-emerald-50">
                  <div className="grow-x h-full rounded-full bg-emerald-500" style={{ width: `${(amount / max) * 100}%`, animationDelay: `${index * 80}ms` }} />
                </div>
              </div>
              <strong className="text-sm text-slate-700">{rp(amount)}</strong>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
