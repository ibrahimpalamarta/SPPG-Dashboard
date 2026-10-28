import { Badge } from "@/components/ui/badge";
import { Pager } from "@/components/ui/pager";

export type Txn = {
  txnId: string;
  txnDate: string | null;
  txnType: string | null;
  direction: string | null;
  category: string | null;
  description: string | null;
  txnTotal: number | null;
  reviewStatus: string | null;
  lines: {
    id: string;
    itemName: string | null;
    counterparty: string | null;
    qty: number | null;
    unit: string | null;
    unitPrice: number | null;
    lineAmount: number | null;
  }[];
};

const rupiah = (n: number | null) => (n === null ? "—" : `Rp${n.toLocaleString("id-ID")}`);
const dateOf = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("id-ID", { dateStyle: "medium", timeZone: "UTC" }) : "—");

/** "Hasil data": mapped Cashflow transactions (one total each) with their item lines, paged. */
export function RecordsTable({
  txns,
  total,
  totals,
  page,
  totalPages,
  hrefFor,
}: {
  txns: Txn[];
  total: number;
  totals: Record<string, number>;
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
}) {
  if (total === 0) return <p className="py-16 text-center text-sm text-slate-500">Belum ada hasil data untuk file ini.</p>;

  return (
    <div className="space-y-4 p-6 text-sm">
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-slate-600">
        <span>
          <strong className="text-slate-900">{total}</strong> transaksi
        </span>
        {Object.entries(totals).map(([direction, sum]) => (
          <span key={direction}>
            Total {direction.toLowerCase()}: <strong className="text-slate-900">{rupiah(sum)}</strong>
          </span>
        ))}
      </div>

      <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
        {txns.map((t) => (
          <li key={t.txnId}>
            <details>
              <summary className="grid cursor-pointer grid-cols-2 gap-x-4 gap-y-1 px-4 py-3 hover:bg-slate-50 md:grid-cols-[9rem_7rem_1fr_9rem_9rem]">
                <span className="font-mono font-semibold text-slate-900">{t.txnId}</span>
                <span className="text-slate-600">{dateOf(t.txnDate)}</span>
                <span className="col-span-2 text-slate-700 md:col-span-1">
                  {t.txnType ?? "—"} · {t.direction ?? "—"} · {t.category ?? "—"}
                  <span className="block text-xs text-slate-500">{t.description}</span>
                </span>
                <span className="font-semibold text-slate-900 md:text-right">{rupiah(t.txnTotal)}</span>
                <span className="md:text-right">
                  <Badge tone={t.reviewStatus === "TERKONFIRMASI" ? "green" : "amber"}>{t.reviewStatus ?? "Tanpa status"}</Badge>
                </span>
              </summary>
              <div className="overflow-x-auto px-4 pb-4">
                <table className="w-full min-w-[36rem] text-left">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="py-2 pr-4 font-medium">Barang</th>
                      <th className="py-2 pr-4 font-medium">Penerima</th>
                      <th className="py-2 pr-4 text-right font-medium">Qty</th>
                      <th className="py-2 pr-4 text-right font-medium">Harga satuan</th>
                      <th className="py-2 text-right font-medium">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {t.lines.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50">
                        <td className="py-2 pr-4 text-slate-800">{l.itemName ?? "—"}</td>
                        <td className="py-2 pr-4 text-slate-600">{l.counterparty ?? "—"}</td>
                        <td className="py-2 pr-4 text-right">{l.qty === null ? "—" : `${l.qty.toLocaleString("id-ID")} ${l.unit ?? ""}`}</td>
                        <td className="py-2 pr-4 text-right">{rupiah(l.unitPrice)}</td>
                        <td className="py-2 text-right">{rupiah(l.lineAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </li>
        ))}
      </ul>
      <Pager page={page} totalPages={totalPages} hrefFor={hrefFor} />
    </div>
  );
}
