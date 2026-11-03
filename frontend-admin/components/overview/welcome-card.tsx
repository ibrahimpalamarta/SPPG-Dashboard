import { CircleDollarSign, RefreshCw, Users, WalletCards } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PeriodFilter } from "@/components/ui/period-filter";
import { KitchenFilter } from "@/components/overview/kitchen-filter";
import { StatCard, type Stat } from "@/components/overview/stat-card";
import { efiInsight, periodSpendInsight, portionsInsight, runwayInsight } from "@/lib/insight";
import { dateLabel, periodSpend, rp, type FinanceKpi, type MenuKpi } from "@/lib/kpi";
import type { Kitchen } from "@/lib/me";

const count = new Intl.NumberFormat("id-ID");

/**
 * Headline stats (SCRUM-103/101/102), in reading order: spend, balance, EFI
 * transfer, beneficiaries. Missing data reads "-", never Rp0; the card's
 * insight says what is missing. Draft vs official stays in the backend
 * (`balance.status`); the tickets ask for no "Belum resmi" label on screen.
 */
function stats(finance: FinanceKpi | null, menu: MenuKpi, period: string): Stat[] {
  const out: Stat[] = [];
  if (finance) {
    const { balance, efi } = finance;
    const sum = balance.accounts.reduce((n, a) => n + (a.balance ?? 0), 0);
    const spend = periodSpend(finance);
    out.push({
      icon: CircleDollarSign,
      label: `Pengeluaran · ${period}`,
      value: spend.days ? rp(spend.total) : "-",
      insight: periodSpendInsight(finance, period),
    });
    out.push({
      icon: WalletCards,
      label: balance.asOf ? `Saldo Rekening · per ${dateLabel(balance.asOf)}` : "Saldo Rekening",
      value: balance.status === "UNAVAILABLE" ? "-" : rp(sum),
      insight: runwayInsight(finance, sum),
    });
    out.push({
      icon: RefreshCw,
      label: efi.latest ? `Transfer EFI Terakhir · ${dateLabel(efi.latest.date)}` : "Transfer EFI Terakhir",
      value: efi.latest?.amount != null ? rp(efi.latest.amount) : "-",
      insight: efiInsight(finance),
    });
  }
  if (menu.portions) {
    const { perDay, status } = menu.portions;
    out.push({
      icon: Users,
      label: "Penerima Manfaat / hari",
      value: perDay === null ? "-" : count.format(perDay),
      status: status === "MISMATCH" ? "Total segmen tidak cocok" : undefined,
      insight: portionsInsight(menu.portions),
    });
  }
  return out;
}

export function WelcomeCard({ name, kitchens, scope, period, finance, menu }: { name: string; kitchens: Kitchen[]; scope: string; period: string; finance: FinanceKpi | null; menu: MenuKpi }) {
  const items = stats(finance, menu, period);
  return (
    <Card className="p-6 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Selamat Datang, {name}!</h1>
        <div className="flex flex-wrap items-center gap-3">
          <KitchenFilter kitchens={kitchens} selected={scope} />
          <PeriodFilter />
        </div>
      </div>
      {items.length > 0 && (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {items.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>
      )}
    </Card>
  );
}
