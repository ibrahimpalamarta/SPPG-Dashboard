import { StatusLabel } from "@/components/kelengkapan/status-label";
import { Badge } from "@/components/ui/badge";
import { byRollout, cellsOf, columns, legend, noteOf, phaseOf } from "@/lib/kelengkapan";
import type { KitchenCompleteness } from "@/lib/kpi";

export function StatusMatrix({ kitchens, selected, onSelect }: { kitchens: KitchenCompleteness[]; selected: string | null; onSelect: (name: string) => void }) {
  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Status per kitchen &amp; jenis data</h2>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {legend.map(({ label, tone }) => (
            <StatusLabel key={label} tone={tone}>{label}</StatusLabel>
          ))}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full min-w-[72rem] text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Kitchen</th>
              {columns.map((column) => (
                <th key={column} className="px-3 py-3 text-center font-medium">{column}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {byRollout(kitchens).map((kitchen) => {
              const phase = phaseOf(kitchen);
              return (
                <tr key={kitchen.name} className={kitchen.name === selected ? "bg-emerald-50/60" : "hover:bg-slate-50"}>
                  <td className="px-4 py-3">
                    {phase ? (
                      <p className="flex items-center gap-2 font-semibold text-slate-800">
                        {kitchen.name}
                        <Badge tone="slate">{phase}</Badge>
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSelect(kitchen.name)}
                        aria-pressed={kitchen.name === selected}
                        className="text-left font-semibold text-slate-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                      >
                        {kitchen.name}
                      </button>
                    )}
                    <p className="text-xs text-slate-500">{noteOf(kitchen)}</p>
                  </td>
                  {phase ? (
                    <td colSpan={columns.length} className="px-3 py-3 text-center text-xs text-slate-400">
                      Akan tersedia pada {phase}
                    </td>
                  ) : (
                    cellsOf(kitchen).map(({ label, status }) => (
                      <td key={label} className="px-3 py-3 text-center">
                        <StatusLabel tone={status.tone} hideText>{status.label}</StatusLabel>
                      </td>
                    ))
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
