import { CircleDollarSign } from "lucide-react";
import { Panel } from "@/components/overview/panel";
import { expenses, expenseTotal } from "@/lib/mock/overview";

const percentFormat = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1 });

// Builds the donut's conic-gradient stops from cumulative percentages.
export function donutGradient() {
  let start = 0;
  const stops = expenses.map(({ percent, color }) => {
    const stop = `${color} ${start}% ${start + percent}%`;
    start += percent;
    return stop;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

export function ExpenseComposition() {
  return (
    <Panel title="Komposisi Pengeluaran" icon={CircleDollarSign}>
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
    </Panel>
  );
}
