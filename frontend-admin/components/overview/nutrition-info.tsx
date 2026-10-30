import { AlertTriangle, HeartPulse } from "lucide-react";
import { Card } from "@/components/ui/card";
import { InsightBox } from "@/components/ui/insight-box";
import { SourceLink } from "@/components/ui/source-link";
import { nutritionInsight } from "@/lib/insight";
import type { MenuKpi } from "@/lib/kpi";

const count = new Intl.NumberFormat("id-ID");
const decimal = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const NUTRIENTS = [
  { key: "energyKcal", label: "Energi", unit: "kkal" },
  { key: "proteinG", label: "Protein", unit: "g" },
  { key: "fatG", label: "Lemak", unit: "g" },
  { key: "carbohydrateG", label: "Karbohidrat", unit: "g" },
  { key: "fiberG", label: "Serat", unit: "g" },
] as const;

const orMissing = (n: number | null) => (n === null ? "Belum ada data" : count.format(n));

/**
 * SCRUM-116/129: delivered (actual) portions only, per segment summing to the
 * total, plus nutrition per portion per segment. Planned portions are not
 * shown here. Missing is shown as missing, never 0.
 */
export function NutritionInfo({ menu }: { menu: MenuKpi }) {
  const { nutrition, portions } = menu;
  const incomplete = nutrition.reduce((n, s) => n + s.incompleteDays, 0);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-3 text-base font-semibold text-slate-900">
          <HeartPulse className="size-5 text-emerald-600" aria-hidden="true" />
          Informasi Gizi
        </h3>
        <SourceLink />
      </div>

      {portions && (
        <div className={`mt-5 rounded-xl border p-4 ${portions.status === "MISMATCH" ? "border-red-200 bg-red-50" : "border-slate-200"}`}>
          <p className="text-sm text-slate-500">Porsi tersalurkan (aktual)</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{portions.actual === null ? "-" : count.format(portions.actual)}</p>
          {portions.status === "MISSING" && <p className="mt-1 text-sm text-slate-500">Belum ada data porsi tersalurkan, jadi tidak dihitung (bukan 0).</p>}
          {portions.status === "MISMATCH" && <p className="mt-1 text-sm font-medium text-red-700">Jumlah per segmen tidak sama dengan total di sumber. Angka ditahan untuk dicek.</p>}
        </div>
      )}

      {nutrition.length === 0 ? (
        <p className="mt-5 text-sm text-slate-500">Belum ada data menu yang dipublish.</p>
      ) : (
        <>
          {portions && portions.status === "OK" && (
            <>
              <h4 className="mt-5 text-sm font-semibold text-slate-800">Porsi tersalurkan per segmen</h4>
              <ul className="mt-3 flex flex-col gap-2 text-sm">
                {portions.segments.map(({ segment, actual }) => (
                  <li key={segment} className="flex items-center gap-2">
                    <span className="flex-1 text-slate-700">{segment}</span>
                    <strong className="text-slate-800">{orMissing(actual)}</strong>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex justify-between border-t border-slate-100 pt-3 text-sm font-semibold text-slate-900">
                <span>Total porsi tersalurkan</span>
                <span>{orMissing(portions.actual)}</span>
              </div>
            </>
          )}

          <h4 className="mt-5 text-sm font-semibold text-slate-800">Gizi rata-rata per porsi</h4>
          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[32rem] text-left">
              <thead className="bg-slate-50 text-sm text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Zat gizi</th>
                  {nutrition.map(({ segment }) => (
                    <th key={segment} className="px-4 py-3 font-medium">
                      Porsi {segment}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {NUTRIENTS.map(({ key, label, unit }) => (
                  <tr key={key}>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-800">{label}</th>
                    {nutrition.map(({ segment, perPortion }) => (
                      <td key={segment} className="px-4 py-3 text-sm font-semibold text-slate-800">
                        {perPortion[key] === null ? <span className="font-normal text-slate-400">Belum ada data</span> : <>{decimal.format(perPortion[key])} <span className="font-normal text-slate-400">{unit}</span></>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {incomplete > 0 && (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="size-5 shrink-0 text-amber-600" aria-hidden="true" />
          <div>
            <p className="font-semibold">Catatan data</p>
            <p>{incomplete} hari-segmen punya nilai gizi kosong; hari itu tidak ikut dirata-rata untuk zat gizi yang kosong.</p>
          </div>
        </div>
      )}

      <InsightBox>{nutritionInsight(nutrition)}</InsightBox>
    </Card>
  );
}
