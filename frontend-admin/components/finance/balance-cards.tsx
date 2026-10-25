import { ArrowLeftRight, Landmark, Shield, TriangleAlert } from "lucide-react";
import { FinanceCard } from "@/components/finance/finance-card";
import { Badge } from "@/components/ui/badge";
import { balance, efi } from "@/lib/mock/finance";

const tableHead = "px-4 py-3 font-medium";

function Unofficial() {
  return (
    <Badge tone="amber">
      <span className="inline-flex items-center gap-1.5">
        <TriangleAlert className="size-3.5" aria-hidden="true" />
        Belum resmi
      </span>
    </Badge>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <TriangleAlert className="mt-0.5 size-5 shrink-0 text-amber-600" aria-hidden="true" />
      <p>{children}</p>
    </div>
  );
}

function DecisionButton({ children }: { children: React.ReactNode }) {
  return (
    <button className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:border-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600">
      <Shield className="size-4" aria-hidden="true" />
      {children}
    </button>
  );
}

export function AccountBalance() {
  return (
    <FinanceCard title="Saldo Rekening" icon={Landmark} badge={<Unofficial />}>
      <p className="text-3xl font-bold text-slate-900">{balance.total}</p>
      <Notice>
        Angka ini <strong>belum resmi</strong> karena Finance belum memutuskan sumber saldo yang dipakai (VA/Aksis, mutasi bank, atau LapKeu).
      </Notice>
      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[26rem] text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className={tableHead}>Sumber</th>
              <th className={`${tableHead} text-right`}>Saldo</th>
              <th className={tableHead}>Dipakai sebagai</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {balance.sources.map(({ source, balance: value, role }) => (
              <tr key={source}>
                <td className="px-4 py-3 text-slate-700">{source}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-slate-800">{value ?? <Badge tone="pending">Belum ada</Badge>}</td>
                <td className="px-4 py-3">
                  <Badge tone={role.tone}>{role.label}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <Badge tone="red">Selisih {balance.gap}</Badge>
        antara VA dan LapKeu · seharusnya Rp0
      </p>
      <div className="mt-4 flex justify-end">
        <DecisionButton>Catat keputusan sumber saldo</DecisionButton>
      </div>
    </FinanceCard>
  );
}

export function EfiTransfer() {
  return (
    <FinanceCard title="Transfer EFI Terakhir" icon={ArrowLeftRight} badge={<Unofficial />}>
      <p className="text-3xl font-bold text-slate-900">{efi.total}</p>
      <p className="mt-1 text-sm text-slate-500">{efi.latest}</p>
      <Notice>
        Angka ini <strong>belum resmi</strong> karena arti “transfer EFI” belum disepakati. Sementara memakai pembayaran Insentif ke Yayasan.
      </Notice>
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
            {efi.transfers.map(({ date, ref, note, amount }) => (
              <tr key={ref}>
                <td className="whitespace-nowrap px-4 py-3 text-slate-700">{date}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{ref}</td>
                <td className="px-4 py-3 text-slate-700">{note}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-slate-800">{amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex justify-end">
        <DecisionButton>Catat keputusan transfer EFI</DecisionButton>
      </div>
    </FinanceCard>
  );
}
