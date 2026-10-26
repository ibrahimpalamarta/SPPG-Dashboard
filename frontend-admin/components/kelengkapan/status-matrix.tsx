import { Badge } from "@/components/ui/badge";
import { columns, legend, matrix } from "@/lib/mock/kelengkapan-data";

export function StatusMatrix() {
  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Status per kitchen &amp; jenis data</h2>
        <div className="flex flex-wrap gap-2">
          {legend.map(({ label, tone }) => (
            <Badge key={label} tone={tone}>{label}</Badge>
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
            {matrix.map(({ code, name, note, cells, active }) => (
              <tr key={code} className={active ? "bg-emerald-50/60" : "hover:bg-slate-50"}>
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-800">{code} · {name}</p>
                  <p className="text-xs text-slate-500">{note}</p>
                </td>
                {cells.map(({ label, tone }, index) => (
                  <td key={columns[index]} className="px-3 py-3 text-center">
                    <Badge tone={tone}>{label}</Badge>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
