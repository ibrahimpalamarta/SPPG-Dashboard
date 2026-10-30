import type { LucideIcon } from "lucide-react";
import { DetailLink } from "@/components/ui/detail-link";

export type Stat = { icon: LucideIcon; label: string; value: string; status?: string };

export function StatCard({ icon: Icon, label, value, status }: Stat) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-start justify-between">
        <span className="flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <DetailLink className="text-slate-500" />
      </div>
      <p className="mt-4 text-sm text-slate-600">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {status && <span className="mt-3 inline-flex rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">{status}</span>}
    </div>
  );
}
