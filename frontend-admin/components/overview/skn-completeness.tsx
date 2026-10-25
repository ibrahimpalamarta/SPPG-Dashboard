import { ChevronRight, Gauge } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SourceLink } from "@/components/ui/source-link";
import { skn } from "@/lib/mock/kelengkapan";

const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const total = skn.items.length;
const percent = Math.round((skn.complete / total) * 100);

export function SknCompleteness() {
  return (
    <Card className="flex flex-col p-6">
      <div className="flex items-start justify-between">
        <span className="flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
          <Gauge className="size-5" aria-hidden="true" />
        </span>
        <button className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800">
          Lihat Detail <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-4 flex items-center gap-5">
        <div className="relative size-24 shrink-0">
          <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden="true">
            <circle cx="50" cy="50" r={RADIUS} fill="none" strokeWidth="10" className="stroke-emerald-50" />
            <circle
              cx="50"
              cy="50"
              r={RADIUS}
              fill="none"
              strokeWidth="10"
              strokeLinecap="round"
              className="stroke-emerald-500"
              strokeDasharray={`${(percent / 100) * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-slate-900">{percent}%</span>
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-900">Kelengkapan Data SKN</h3>
          <p className="mt-1 text-sm text-slate-500">{skn.complete} dari {total} data wajib sudah lengkap</p>
          <p className="text-sm text-slate-500">{skn.sent} dari {total} sudah dikirim</p>
        </div>
      </div>

      <ul className="mt-5 flex flex-col gap-3">
        {skn.items.map(({ label, status, tone }) => (
          <li key={label} className="flex items-center justify-between gap-3 text-sm text-slate-700">
            {label}
            <Badge tone={tone}>{status}</Badge>
          </li>
        ))}
      </ul>

      <div className="mt-auto flex justify-end border-t border-slate-100 pt-4">
        <SourceLink />
      </div>
    </Card>
  );
}
