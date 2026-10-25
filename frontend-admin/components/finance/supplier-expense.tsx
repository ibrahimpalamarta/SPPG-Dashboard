import { BarChart3, CircleDollarSign } from "lucide-react";
import { FinanceCard } from "@/components/finance/finance-card";
import { donutGradient } from "@/components/overview/expense-composition";
import { categories, suppliers } from "@/lib/mock/finance";
import { expenses, expenseTotal } from "@/lib/mock/overview";

const percentFormat = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1 });

export function TopSuppliers() {
  return (
    <FinanceCard title="Top 5 Supplier" icon={BarChart3} sourceAtBottom>
      <div className="flex flex-col gap-5">
        {suppliers.map(({ name, amount, percent, progress }, index) => (
          <div key={name} className="grid grid-cols-[24px_1fr_auto] items-center gap-3">
            <span className="text-sm text-slate-500">{index + 1}</span>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">{name}</p>
              <div className="h-2 overflow-hidden rounded-full bg-emerald-50">
                <div className="grow-x h-full rounded-full bg-emerald-500" style={{ width: `${progress}%`, animationDelay: `${index * 80}ms` }} />
              </div>
            </div>
            <div className="text-right text-sm">
              <strong className="block text-slate-800">{amount}</strong>
              <span className="text-slate-400">{percent}</span>
            </div>
          </div>
        ))}
      </div>
    </FinanceCard>
  );
}

export function ExpenseBreakdown() {
  return (
    <FinanceCard title="Komposisi Pengeluaran" icon={CircleDollarSign}>
      <div className="flex flex-col items-center gap-6 sm:flex-row">
        <div className="sweep flex size-40 shrink-0 items-center justify-center rounded-full" style={{ background: donutGradient() }}>
          <div className="flex size-24 flex-col items-center justify-center rounded-full bg-white">
            <strong className="text-xl text-slate-900">{expenseTotal}</strong>
            <span className="text-xs text-slate-500">total keluar</span>
          </div>
        </div>
        <div className="flex w-full flex-col gap-3">
          {expenses.map(({ label, amount, percent, color }) => (
            <div key={label} className="flex items-center gap-2 text-sm">
              <span className="size-3 rounded-sm" style={{ backgroundColor: color }} />
              <span className="flex-1 text-slate-600">{label}</span>
              <strong className="text-slate-800">{amount}</strong>
              <span className="w-12 text-right text-slate-400">{percentFormat.format(percent)}%</span>
            </div>
          ))}
        </div>
      </div>

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
            {categories.map(({ category, written, value, muted }) => (
              <tr key={category} className={muted ? "text-slate-400" : undefined}>
                <td className={`px-4 py-3 ${muted ? "" : "font-semibold text-slate-800"}`}>{category}</td>
                <td className={`px-4 py-3 ${muted ? "" : "text-slate-500"}`}>{written}</td>
                <td className={`whitespace-nowrap px-4 py-3 text-right ${muted ? "" : "text-slate-800"}`}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </FinanceCard>
  );
}
