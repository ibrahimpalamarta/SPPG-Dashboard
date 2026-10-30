import { Hash, TrendingUp, WalletCards } from "lucide-react";
import { Card } from "@/components/ui/card";
import { rp, type FinanceKpi } from "@/lib/kpi";

export function StatStrip({ spend }: { spend: FinanceKpi["spend"] }) {
  const stats = [
    { icon: WalletCards, label: "Belanja ke supplier", value: rp(spend.total) },
    { icon: Hash, label: "Jumlah transaksi", value: String(spend.transactions) },
    { icon: TrendingUp, label: "Rata-rata belanja per hari", value: spend.perDay === null ? "-" : rp(spend.perDay) },
  ];
  return (
    <Card className="grid divide-y divide-slate-200 sm:grid-cols-3 sm:divide-y-0 lg:divide-x">
      {stats.map(({ icon: Icon, label, value }) => (
        <div key={label} className="p-5">
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
        </div>
      ))}
    </Card>
  );
}
