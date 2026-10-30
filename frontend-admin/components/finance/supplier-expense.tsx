import { BarChart3, CircleDollarSign } from "lucide-react";
import { FinanceCard } from "@/components/finance/finance-card";
import { ExpenseDonut } from "@/components/overview/expense-composition";
import { pct, rp, rpFull, type FinanceKpi, type Slice } from "@/lib/kpi";

export function TopSuppliers({ suppliers }: { suppliers: FinanceKpi["topSuppliers"] }) {
  const max = suppliers[0]?.amount ?? 0;
  return (
    <FinanceCard title="Top 5 Supplier" icon={BarChart3} sourceAtBottom>
      {suppliers.length === 0 && <p className="text-sm text-slate-500">Belum ada data belanja yang dipublish.</p>}
      <div className="flex flex-col gap-5">
        {suppliers.map(({ name, amount, share }, index) => (
          <div key={name} className="grid grid-cols-[24px_1fr_auto] items-center gap-3">
            <span className="text-sm text-slate-500">{index + 1}</span>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">{name}</p>
              <div className="h-2 overflow-hidden rounded-full bg-emerald-50">
                <div className="grow-x h-full rounded-full bg-emerald-500" style={{ width: `${(amount / max) * 100}%`, animationDelay: `${index * 80}ms` }} />
              </div>
            </div>
            <div className="text-right text-sm">
              <strong className="block text-slate-800">{rp(amount)}</strong>
              <span className="text-slate-400">{pct(share)}</span>
            </div>
          </div>
        ))}
      </div>
    </FinanceCard>
  );
}

/** SCRUM-99: master category, the raw labels it came from (trace), and the flagged unmapped remainder. */
export function ExpenseBreakdown({ slices, total }: { slices: Slice[]; total: number }) {
  return (
    <FinanceCard title="Komposisi Pengeluaran" icon={CircleDollarSign}>
      <ExpenseDonut slices={slices} total={total} />
      {slices.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Kategori</th>
                <th className="px-4 py-3 font-medium">Tertulis di file</th>
                <th className="px-4 py-3 text-right font-medium">Nilai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {slices.map(({ label, raw, amount, unmapped }) => (
                <tr key={label} className={unmapped ? "bg-amber-50/50" : undefined}>
                  <td className={`px-4 py-3 font-semibold ${unmapped ? "text-amber-800" : "text-slate-800"}`}>{label}</td>
                  <td className="px-4 py-3 text-slate-500">{raw.join("; ") || "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-slate-800">{rpFull(amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </FinanceCard>
  );
}
