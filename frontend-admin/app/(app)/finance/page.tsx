import type { Metadata } from "next";
import { Calculator } from "lucide-react";
import { AccountBalance, EfiTransfer } from "@/components/finance/balance-cards";
import { FinanceCard } from "@/components/finance/finance-card";
import { DailySpending, MonthlySpending } from "@/components/finance/spending-charts";
import { StatStrip } from "@/components/finance/stat-strip";
import { ExpenseBreakdown, TopSuppliers } from "@/components/finance/supplier-expense";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PeriodFilter } from "@/components/ui/period-filter";
import { KitchenFilter } from "@/components/overview/kitchen-filter";
import { getT } from "@/lib/lang-server";
import { requirePage } from "@/lib/guard";
import { financeKpi, mixSlices, rpFull } from "@/lib/kpi";
import { kpiQuery, resolvePeriod, resolveScope, type PeriodParams } from "@/lib/overview-filter";

export async function generateMetadata(): Promise<Metadata> {
  return { title: `${(await getT())("Finance & Cost")} · SPPG Internal` };
}

export default async function FinancePage({ searchParams }: { searchParams: Promise<PeriodParams & { dapur?: string }> }) {
  const [me, t] = await Promise.all([requirePage("/finance"), getT()]);
  const params = await searchParams;
  const scope = resolveScope(me.kitchens, params.dapur);
  const finance = await financeKpi(kpiQuery(resolvePeriod(params), scope));
  if (!finance) {
    return (
      <EmptyState title={t("Tidak ada akses")}>
        <p>{t("Peran Anda tidak dapat melihat angka biaya.")}</p>
      </EmptyState>
    );
  }
  const planned = finance.plannedCostPerPortion;
  return (
    <div className="mx-auto max-w-400">
      <Card className="space-y-5 p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{t("Finance & Cost")}</h1>
          <div className="flex flex-wrap items-center gap-3">
            <KitchenFilter kitchens={me.kitchens} selected={scope.value} />
            <PeriodFilter />
          </div>
        </div>

        <StatStrip spend={finance.spend} />
        <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
          <TopSuppliers suppliers={finance.topSuppliers} />
          <ExpenseBreakdown slices={mixSlices(finance)} total={finance.spend.total} />
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          <MonthlySpending daily={finance.daily} />
          <DailySpending daily={finance.daily} />
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          <AccountBalance balance={finance.balance} />
          <EfiTransfer efi={finance.efi} />
        </div>
        {/* SCRUM-100: behind KPI_PLANNED_COST until B-PLAN is decided; always labelled as plan, never actual. */}
        {planned.enabled && (
          <FinanceCard title={`${t("Biaya per Porsi")} · ${planned.label}`} icon={Calculator}>
            <p className="text-3xl font-bold text-slate-900">{planned.value === null ? "-" : rpFull(Math.round(planned.value))}</p>
            <p className="mt-1 text-sm text-slate-500">{t("Rencana dari RAB yang dipublish, bukan belanja aktual. Rumus {version}.", { version: planned.formulaVersion })}</p>
            {planned.incomplete && <p className="mt-2 text-sm text-amber-800">{t("Sebagian baris RAB tanpa total atau jumlah paket; angka belum lengkap.")}</p>}
          </FinanceCard>
        )}
      </Card>
    </div>
  );
}
