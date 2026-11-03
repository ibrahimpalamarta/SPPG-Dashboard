import { CircleDollarSign } from "lucide-react";
import { getT } from "@/lib/lang-server";
import { Panel } from "@/components/overview/panel";
import { donutGradient, rp, type Slice } from "@/lib/kpi";

const percentFormat = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Donut + legend, shared by Overview and Finance & Cost (SCRUM-99). */
export async function ExpenseDonut({ slices, total }: { slices: Slice[]; total: number }) {
  const t = await getT();
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row">
      <div className="sweep flex size-40 shrink-0 items-center justify-center rounded-full" style={{ background: donutGradient(slices) }}>
        <div className="flex size-24 flex-col items-center justify-center rounded-full bg-white">
          <strong className="text-xl text-slate-900">{slices.length ? rp(total) : "-"}</strong>
          <span className="text-xs text-slate-500">{t("total keluar")}</span>
        </div>
      </div>
      <div className="flex w-full flex-col gap-3">
        {slices.length === 0 && <p className="text-sm text-slate-500">{t("Belum ada data belanja yang dipublish.")}</p>}
        {slices.map(({ label, amount, percent, color, unmapped }) => (
          <div key={label} className="flex items-center gap-2 text-sm">
            <span className="size-3 rounded-sm" style={{ backgroundColor: color }} />
            <span className={`flex-1 ${unmapped ? "text-amber-700" : "text-slate-600"}`}>{t(label)}</span>
            <strong className="text-slate-800">{rp(amount)}</strong>
            <span className="w-12 text-right text-slate-600">{percentFormat.format(percent)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export async function ExpenseComposition({ slices, total, insight }: { slices: Slice[]; total: number; insight?: string }) {
  const t = await getT();
  return (
    <Panel title={t("Komposisi Pengeluaran")} icon={CircleDollarSign} insight={insight}>
      <ExpenseDonut slices={slices} total={total} />
    </Panel>
  );
}
