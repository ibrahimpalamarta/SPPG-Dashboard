import { AlertTriangle, HeartPulse } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SourceLink } from "@/components/ui/source-link";
import { dataNote, nutrients, portionNote, segments } from "@/lib/mock/menu-gizi";

const count = new Intl.NumberFormat("id-ID");
const decimal = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const total = segments.reduce((sum, { portions }) => sum + portions, 0);

function NutrientCell({ value, unit, ratio }: { value: number; unit: string; ratio: number }) {
  return (
    <td className="px-4 py-3">
      <p className="text-sm font-semibold text-slate-800">
        {decimal.format(value)} <span className="font-normal text-slate-400">{unit}</span>
      </p>
      <div className="mt-1.5 h-1.5 max-w-56 overflow-hidden rounded-full bg-emerald-50">
        <div className="grow-x h-full rounded-full bg-emerald-500" style={{ width: `${ratio * 100}%` }} />
      </div>
    </td>
  );
}

export function NutritionInfo() {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-3 text-base font-semibold text-slate-900">
          <HeartPulse className="size-5 text-emerald-600" aria-hidden="true" />
          Informasi Gizi
        </h3>
        <SourceLink />
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 p-4">
        <p className="text-sm text-slate-500">Porsi tersalurkan (aktual)</p>
        <p className="mt-1 text-3xl font-bold text-slate-900">{count.format(total)}</p>
      </div>
      <p className="mt-3 text-sm text-slate-500">{portionNote}</p>

      <h4 className="mt-5 text-sm font-semibold text-slate-800">Porsi per segmen</h4>
      <div className="mt-3 flex h-2 gap-0.5 overflow-hidden rounded-full">
        {segments.map(({ label, portions, color }) => (
          <div key={label} className="grow-x" style={{ width: `${(portions / total) * 100}%`, backgroundColor: color }} />
        ))}
      </div>
      <ul className="mt-3 flex flex-col gap-2 text-sm">
        {segments.map(({ label, portions, color }) => (
          <li key={label} className="flex items-center gap-2">
            <span className="size-3 rounded-sm" style={{ backgroundColor: color }} />
            <span className="flex-1 text-slate-700">{label}</span>
            <strong className="text-slate-800">{count.format(portions)}</strong>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex justify-between border-t border-slate-100 pt-3 text-sm font-semibold text-slate-900">
        <span>Total porsi tersalurkan</span>
        <span>{count.format(total)}</span>
      </div>

      <h4 className="mt-5 text-sm font-semibold text-slate-800">Gizi rata-rata per porsi</h4>
      <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[32rem] text-left">
          <thead className="bg-slate-50 text-sm text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Zat gizi</th>
              <th className="px-4 py-3 font-medium">Porsi Besar</th>
              <th className="px-4 py-3 font-medium">Porsi Kecil</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {nutrients.map(({ label, unit, large, small }) => (
              <tr key={label}>
                <th className="px-4 py-3 text-sm font-semibold text-slate-800">{label}</th>
                <NutrientCell value={large} unit={unit} ratio={1} />
                <NutrientCell value={small} unit={unit} ratio={small / large} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <AlertTriangle className="size-5 shrink-0 text-amber-600" aria-hidden="true" />
        <div>
          <p className="font-semibold">Catatan data</p>
          <p>{dataNote}</p>
        </div>
      </div>
    </Card>
  );
}
