import { BarChart3, TrendingUp } from "lucide-react";
import { FinanceCard } from "@/components/finance/finance-card";
import { daily, monthly } from "@/lib/mock/finance";

const monthlyMax = 1000;
const dailyMax = 50;
const monthlyTicks = [1000, 750, 500, 250, 0];
const dailyTicks = [50, 38, 25, 13, 0];

function YAxis({ ticks }: { ticks: number[] }) {
  return (
    <div className="flex h-44 w-12 flex-col justify-between text-right text-xs text-slate-400">
      {ticks.map((tick) => (
        <span key={tick}>{tick} jt</span>
      ))}
    </div>
  );
}

function Gridlines() {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((line) => (
        <div key={line} className="border-t border-dashed border-slate-200" />
      ))}
    </div>
  );
}

export function MonthlySpending() {
  const latest = monthly[monthly.length - 1].label;

  return (
    <FinanceCard title="Belanja per Bulan · Sukun" icon={BarChart3}>
      <div className="flex gap-3">
        <YAxis ticks={monthlyTicks} />
        <div className="flex-1">
          <div className="relative h-44">
            <Gridlines />
            <div className="relative flex h-full items-end justify-around">
              {monthly.map(({ label, value }, index) => (
                <div key={label} className="flex h-full w-10 flex-col justify-end">
                  {label === latest && <span className="mb-1 text-center text-xs font-semibold text-slate-800">{value} jt</span>}
                  <div className={`grow-y rounded-t-md ${label === latest ? "bg-emerald-500" : "bg-emerald-300"}`} style={{ height: `${(value / monthlyMax) * 100}%`, animationDelay: `${index * 80}ms` }} />
                </div>
              ))}
            </div>
          </div>
          <div className="mt-2 flex justify-around text-xs text-slate-500">
            {monthly.map(({ label }) => (
              <span key={label} className={`w-10 text-center ${label === latest ? "font-semibold text-slate-800" : ""}`}>{label}</span>
            ))}
          </div>
        </div>
      </div>
    </FinanceCard>
  );
}

export function DailySpending() {
  const step = 100 / (daily.length - 1);
  const points = daily.map(({ value }, index) => `${index * step},${100 - (value / dailyMax) * 100}`);
  const last = daily[daily.length - 1];

  return (
    <FinanceCard title="Belanja per Hari · 31 Jul – 13 Agu 2026" icon={TrendingUp}>
      <div className="flex gap-3">
        <YAxis ticks={dailyTicks} />
        <div className="flex-1">
          <div className="relative h-44">
            <Gridlines />
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="reveal absolute inset-0 size-full overflow-visible" aria-hidden="true">
              <polygon points={`0,100 ${points.join(" ")} 100,100`} className="fill-emerald-50" />
              <polyline points={points.join(" ")} fill="none" strokeWidth="2" vectorEffect="non-scaling-stroke" className="stroke-emerald-500" />
            </svg>
            <span className="pop absolute size-2.5 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-emerald-500 bg-white" style={{ left: "100%", bottom: `${(last.value / dailyMax) * 100}%` }} aria-hidden="true" />
          </div>
          <div className="mt-2 flex justify-between text-xs text-slate-500">
            {daily.map(({ label }) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </div>
      </div>
    </FinanceCard>
  );
}
