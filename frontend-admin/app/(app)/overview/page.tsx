import type { Metadata } from "next";
import { ExpenseComposition } from "@/components/overview/expense-composition";
import { KelengkapanSection } from "@/components/overview/kelengkapan-section";
import { MenuGiziSection } from "@/components/overview/menu-gizi-section";
import { TopSuppliers } from "@/components/overview/top-suppliers";
import { WelcomeCard } from "@/components/overview/welcome-card";
import { apiGet } from "@/lib/api";
import { getT } from "@/lib/lang-server";
import { requirePage } from "@/lib/guard";
import { expenseInsight, supplierInsight } from "@/lib/insight";
import { financeKpi, mixSlices, type KitchenCompleteness, type MenuKpi } from "@/lib/kpi";
import { kpiQuery, resolvePeriod, resolveScope, type PeriodParams } from "@/lib/overview-filter";

export async function generateMetadata(): Promise<Metadata> {
  return { title: `${(await getT())("Overview")} · SPPG Internal` };
}

export default async function OverviewPage({ searchParams }: { searchParams: Promise<PeriodParams & { dapur?: string }> }) {
  const [me, t] = await Promise.all([requirePage("/overview"), getT()]);
  const params = await searchParams;
  const scope = resolveScope(me.kitchens, params.dapur);
  const period = resolvePeriod(params);
  const query = kpiQuery(period, scope);
  // SCRUM-97..116: published data only; finance is null for roles without cost clearance.
  const [finance, menu, completeness] = await Promise.all([
    financeKpi(query),
    apiGet<MenuKpi>(`/kpi/menu${query}`),
    apiGet<{ kitchens: KitchenCompleteness[] }>("/kpi/completeness"),
  ]);
  return (
    <div className="mx-auto max-w-400 space-y-5">
      <WelcomeCard name={me.fullName ?? me.email ?? t("Pengguna")} kitchens={me.kitchens} scope={scope.value} period={period.label} finance={finance} menu={menu} />
      {finance && (
        <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <TopSuppliers suppliers={finance.topSuppliers} insight={supplierInsight(t, finance)} />
          <ExpenseComposition slices={mixSlices(finance)} total={finance.spend.total} insight={expenseInsight(t, finance)} />
        </div>
      )}
      <MenuGiziSection menu={menu} />
      <KelengkapanSection kitchens={completeness.kitchens} />
    </div>
  );
}
