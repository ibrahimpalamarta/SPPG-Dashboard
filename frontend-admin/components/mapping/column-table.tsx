import { Badge } from "@/components/ui/badge";
import { getT } from "@/lib/lang-server";
import type { MappingResult } from "@/lib/mapping-validasi";

/** "Kolom file": each header of the file and the field the mapping profile reads it into. */
export async function ColumnTable({ result }: { result: MappingResult | null }) {
  const t = await getT();
  if (!result) return <p className="py-16 text-center text-sm text-slate-500">{t("Hasil pembacaan kolom belum tersimpan untuk file ini. Unggah ulang file untuk melihatnya.")}</p>;
  const columns = result.mapping?.columns ?? [];
  const diff = result.columnDiff.filter((d) => d.missing.length || d.unexpected.length);

  return (
    <div className="space-y-6 p-6 text-sm">
      {diff.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[32rem] text-left">
            <caption className="px-4 pt-3 text-left font-semibold text-slate-900">{t("Perbedaan kolom dengan format yang dikenal")}</caption>
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">{t("Sheet")}</th>
                <th className="px-4 py-3 font-medium">{t("Kolom tidak ditemukan")}</th>
                <th className="px-4 py-3 font-medium">{t("Kolom tidak dikenal")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {diff.map((d) => (
                <tr key={d.sheet} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-800">{d.sheet}</td>
                  <td className="px-4 py-3 text-red-700">{d.missing.join(", ") || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{d.unexpected.join(", ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {columns.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[36rem] text-left">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">{t("Sheet")}</th>
                <th className="px-4 py-3 font-medium">{t("Kolom")}</th>
                <th className="px-4 py-3 font-medium">{t("Judul di file")}</th>
                <th className="px-4 py-3 font-medium">{t("Dibaca sebagai")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {columns.map((c) => (
                <tr key={`${c.sheet}-${c.column}`} className={`hover:bg-slate-50 ${c.field ? "" : "text-slate-600"}`}>
                  <td className="px-4 py-3">{c.sheet}</td>
                  <td className="px-4 py-3 font-mono">{c.column}</td>
                  <td className="px-4 py-3 font-semibold">{c.header}</td>
                  <td className="px-4 py-3">{c.field ? <span className="font-mono text-slate-800">{c.field}</span> : <Badge tone="slate">{t("Tidak dipakai")}</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ul className="space-y-1 text-slate-600">
        {result.sheets.map((s) => (
          <li key={s.name}>
            {t("Sheet")} <span className="font-semibold text-slate-800">{s.name}</span>:{" "}
            {s.skipped ? t("dilewati, {reason}", { reason: s.skipped }) : s.headerRow ? t("header baris {row}, {count} baris data", { row: s.headerRow, count: s.rowCount }) : t("header tidak ditemukan")}
          </li>
        ))}
      </ul>
    </div>
  );
}
