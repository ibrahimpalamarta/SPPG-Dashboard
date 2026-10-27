import { StatusLabel } from "@/components/kelengkapan/status-label";
import { Badge } from "@/components/ui/badge";
import { columns, legend, matrix } from "@/lib/mock/kelengkapan-data";

export function StatusMatrix() {
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
            {matrix.map(({ code, name, note, cells, active, phase }) => (
              <tr key={code} className={active ? "bg-emerald-50/60" : "hover:bg-slate-50"}>
                <td className="px-4 py-3">
                  <p className="flex items-center gap-2 font-semibold text-slate-800">
                    {code} · {name}
                    {phase && <Badge tone="slate">{phase}</Badge>}
                  </p>
                  <p className="text-xs text-slate-500">{note}</p>
                </td>
                {phase ? (
                  <td colSpan={columns.length} className="px-3 py-3 text-center text-xs text-slate-400">
                    Akan tersedia pada {phase}
                  </td>
                ) : (
                  cells.map(({ label, tone }, index) => (
                    <td key={columns[index]} className="px-3 py-3 text-center">
                      <StatusLabel tone={tone}>{label}</StatusLabel>
                    </td>
                  ))
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
