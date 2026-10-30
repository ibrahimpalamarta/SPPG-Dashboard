import { ArrowLeftRight, Landmark, TriangleAlert } from "lucide-react";
import { FinanceCard } from "@/components/finance/finance-card";
import { Badge } from "@/components/ui/badge";
import { dateLabel, rp, rpFull, type FinanceKpi } from "@/lib/kpi";

const tableHead = "px-4 py-3 font-medium";

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <TriangleAlert className="mt-0.5 size-5 shrink-0 text-amber-600" aria-hidden="true" />
      <p>{children}</p>
    </div>
  );
}

/** SCRUM-101: Draft vs official stays in the backend until OD-02 (no "Belum resmi" label on screen); "Belum ada data" when there is none. */
export function AccountBalance({ balance }: { balance: FinanceKpi["balance"] }) {
  const total = balance.accounts.reduce((n, a) => n + (a.balance ?? 0), 0);
  return (
    <FinanceCard title="Saldo Rekening" icon={Landmark}>
      <p className="text-3xl font-bold text-slate-900">{balance.status === "UNAVAILABLE" ? "-" : rpFull(total)}</p>
      {balance.asOf && <p className="mt-1 text-sm text-slate-500">per {dateLabel(balance.asOf)}</p>}
      {balance.status === "UNAVAILABLE" && <Notice>Belum ada data saldo yang dipublish untuk dapur ini.</Notice>}
      {balance.accounts.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[26rem] text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className={tableHead}>Rekening</th>
                <th className={tableHead}>Sumber</th>
                <th className={`${tableHead} text-right`}>Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {balance.accounts.map(({ accountRef, sourceSystem, balance: value }) => (
                <tr key={accountRef}>
                  <td className="px-4 py-3 text-slate-700">{accountRef}</td>
                  <td className="px-4 py-3 text-slate-500">{sourceSystem}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-slate-800">{value === null ? <Badge tone="pending">Belum ada</Badge> : rpFull(value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </FinanceCard>
  );
}

/** SCRUM-102: latest EFI transfers (incentive to Yayasan Edufarmers), kept out of supplier spend. */
export function EfiTransfer({ efi }: { efi: FinanceKpi["efi"] }) {
  return (
    <FinanceCard title="Transfer EFI Terakhir" icon={ArrowLeftRight}>
      <p className="text-3xl font-bold text-slate-900">{efi.latest?.amount != null ? rpFull(efi.latest.amount) : "-"}</p>
      {efi.latest && (
        <p className="mt-1 text-sm text-slate-500">
          {dateLabel(efi.latest.date)} · {efi.latest.ref}
        </p>
      )}
      {efi.transfers.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">Belum ada transfer EFI yang dipublish.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className={tableHead}>Tanggal</th>
                <th className={tableHead}>No. referensi</th>
                <th className={tableHead}>Keterangan</th>
                <th className={`${tableHead} text-right`}>Nominal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {efi.transfers.map(({ date, ref, description, amount }) => (
                <tr key={ref}>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">{dateLabel(date)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{ref}</td>
                  <td className="px-4 py-3 text-slate-700">{description ?? "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-slate-800">{amount === null ? "-" : rp(amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </FinanceCard>
  );
}
