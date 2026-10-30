import { BarChart3, TrendingUp } from "lucide-react";
import { FinanceCard } from "@/components/finance/finance-card";
import { dateLabel, type FinanceKpi } from "@/lib/kpi";

type Point = { label: string; value: number };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
/** The daily chart shows the last two weeks with spend. */
const DAILY_POINTS = 14;
const jt = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });

/** A round axis top in juta, so the ticks read 0 / ¼ / ½ / ¾ / max. */
function axisMax(values: number[]) {
  const max = Math.max(1, ...values) / 1e6;
  const step = 10 ** Math.floor(Math.log10(max));
  return Math.ceil(max / step) * step * 1e6;
}

function YAxis({ max }: { max: number }) {
  return (
    <div className="flex h-44 w-12 flex-col justify-between text-right text-xs text-slate-400">
      {[1, 0.75, 0.5, 0.25, 0].map((f) => (
        <span key={f}>{jt.format((max * f) / 1e6)} jt</span>
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

const Empty = () => <p className="text-sm text-slate-500">Belum ada data belanja yang dipublish.</p>;

export function MonthlySpending({ daily }: { daily: FinanceKpi["daily"] }) {
  const byMonth = new Map<string, number>();
  for (const { date, amount } of daily) byMonth.set(date.slice(0, 7), (byMonth.get(date.slice(0, 7)) ?? 0) + amount);
  const monthly: Point[] = [...byMonth].map(([ym, value]) => ({ label: MONTHS[Number(ym.slice(5)) - 1]!, value }));
  const max = axisMax(monthly.map((m) => m.value));
  const latest = monthly.length - 1;

  return (
    <FinanceCard title="Belanja per Bulan" icon={BarChart3}>
      {monthly.length === 0 ? (
        <Empty />
      ) : (
        <div className="flex gap-3">
          <YAxis max={max} />
          <div className="flex-1">
            <div className="relative h-44">
              <Gridlines />
              <div className="relative flex h-full items-end justify-around">
                {monthly.map(({ label, value }, index) => (
                  <div key={label} className="flex h-full w-10 flex-col justify-end">
                    {index === latest && <span className="mb-1 text-center text-xs font-semibold text-slate-800">{jt.format(value / 1e6)} jt</span>}
                    <div className={`grow-y rounded-t-md ${index === latest ? "bg-emerald-500" : "bg-emerald-300"}`} style={{ height: `${(value / max) * 100}%`, animationDelay: `${index * 80}ms` }} />
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-2 flex justify-around text-xs text-slate-500">
              {monthly.map(({ label }, index) => (
                <span key={label} className={`w-10 text-center ${index === latest ? "font-semibold text-slate-800" : ""}`}>
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </FinanceCard>
  );
}

export function DailySpending({ daily }: { daily: FinanceKpi["daily"] }) {
  const points = daily.slice(-DAILY_POINTS);
  const max = axisMax(points.map((p) => p.amount));
  const step = 100 / Math.max(1, points.length - 1);
  const coords = points.map(({ amount }, index) => `${index * step},${100 - (amount / max) * 100}`);
  const last = points.at(-1);
  const title = points.length ? `Belanja per Hari · ${dateLabel(points[0]!.date)} – ${dateLabel(last!.date)}` : "Belanja per Hari";

  return (
    <FinanceCard title={title} icon={TrendingUp}>
      {!last ? (
        <Empty />
      ) : (
        <div className="flex gap-3">
          <YAxis max={max} />
          <div className="flex-1">
            <div className="relative h-44">
              <Gridlines />
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="reveal absolute inset-0 size-full overflow-visible" aria-hidden="true">
                <polygon points={`0,100 ${coords.join(" ")} 100,100`} className="fill-emerald-50" />
                <polyline points={coords.join(" ")} fill="none" strokeWidth="2" vectorEffect="non-scaling-stroke" className="stroke-emerald-500" />
              </svg>
              <span className="pop absolute size-2.5 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-emerald-500 bg-white" style={{ left: "100%", bottom: `${(last.amount / max) * 100}%` }} aria-hidden="true" />
            </div>
            <div className="mt-2 flex justify-between text-xs text-slate-500">
              {points.map(({ date }) => (
                <span key={date}>{date.slice(8, 10)}/{date.slice(5, 7)}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </FinanceCard>
  );
}
