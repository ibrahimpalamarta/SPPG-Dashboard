import { ChevronRight, Check, Gauge, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SourceLink } from "@/components/ui/source-link";
import { completenessColor, type KitchenCompleteness } from "@/lib/kpi";

const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function SknCompleteness({ kitchen }: { kitchen: KitchenCompleteness }) {
  const { name, items, complete, sent, total, percent } = kitchen;
  return (
    <Card className="flex flex-col p-6">
      <div className="flex items-start justify-between">
        <span className="flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
          <Gauge className="size-5" aria-hidden="true" />
        </span>
        <button className="flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-800">
          Lihat Detail <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-4 flex items-center gap-5">
        <div className="relative size-24 shrink-0">
          <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden="true">
            <circle cx="50" cy="50" r={RADIUS} fill="none" strokeWidth="10" className="stroke-slate-100" />
            <circle
              cx="50"
              cy="50"
              r={RADIUS}
              fill="none"
              strokeWidth="10"
              strokeLinecap="round"
              className={completenessColor(percent).stroke}
              strokeDasharray={`${(percent / 100) * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-slate-900">{percent}%</span>
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-900">Kelengkapan Data</h3>
          <p className="mt-1 text-sm text-slate-500">{name}</p>
          <p className="text-sm text-slate-500">{complete} dari {total} data wajib sudah lengkap</p>
          <p className="text-sm text-slate-500">{sent} dari {total} sudah dikirim</p>
        </div>
      </div>

      <ul className="mt-5 flex flex-col gap-3">
        {items.map(({ label, state }) => (
          <li key={label} className="flex items-center justify-between gap-3 text-sm text-slate-700">
            {label}
            {state === "MISSING" ? (
              <Minus className="size-4 text-slate-400" aria-label="Belum masuk" />
            ) : (
              <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                <Check className="size-3.5" strokeWidth={3} aria-label={state === "COMPLETE" ? "Lengkap" : "Sudah dikirim"} />
              </span>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-auto flex justify-end border-t border-slate-100 pt-4">
        <SourceLink className="text-slate-500 hover:text-slate-800" />
      </div>
    </Card>
  );
}
