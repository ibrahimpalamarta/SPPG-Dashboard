import { RefreshCw, Users, WalletCards } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatCard, type Stat } from "@/components/overview/stat-card";
import { dateLabel, rp, type FinanceKpi, type MenuKpi } from "@/lib/kpi";

const count = new Intl.NumberFormat("id-ID");

/**
 * Headline stats (SCRUM-103/101/102). Missing data reads "Belum ada data",
 * never Rp0; the balance is never official until OD-02 is decided.
 */
function stats(finance: FinanceKpi | null, menu: MenuKpi): Stat[] {
  const out: Stat[] = [];
  if (menu.portions) {
    const { actual, status } = menu.portions;
    out.push({
      icon: Users,
      label: "Porsi tersalurkan",
      value: actual === null ? "-" : count.format(actual),
      status: status === "MISSING" ? "Belum ada data" : status === "MISMATCH" ? "Total segmen tidak cocok" : undefined,
    });
  }
  if (finance) {
    const { balance, efi } = finance;
    const sum = balance.accounts.reduce((n, a) => n + (a.balance ?? 0), 0);
    out.push({
      icon: WalletCards,
      label: balance.asOf ? `Saldo Rekening · per ${dateLabel(balance.asOf)}` : "Saldo Rekening",
      value: balance.status === "UNAVAILABLE" ? "-" : rp(sum),
      status: balance.status === "UNAVAILABLE" ? "Belum ada data" : "Belum resmi",
    });
    out.push({
      icon: RefreshCw,
      label: efi.latest ? `Transfer EFI Terakhir · ${dateLabel(efi.latest.date)}` : "Transfer EFI Terakhir",
      value: efi.latest?.amount != null ? rp(efi.latest.amount) : "-",
      // The EFI definition is still an assumption (decisions D-20).
      status: efi.latest ? "Belum resmi" : "Belum ada data",
    });
  }
  return out;
}

export function WelcomeCard({ name, finance, menu }: { name: string; finance: FinanceKpi | null; menu: MenuKpi }) {
  const items = stats(finance, menu);
  return (
    <Card className="p-6 sm:p-7">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Overview · {name}</h1>
      {items.length > 0 && (
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {items.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>
      )}
    </Card>
  );
}
