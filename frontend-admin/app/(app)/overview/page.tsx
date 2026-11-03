import type { Metadata } from "next";
import { ExpenseComposition } from "@/components/overview/expense-composition";
import { KelengkapanSection } from "@/components/overview/kelengkapan-section";
import { MenuGiziSection } from "@/components/overview/menu-gizi-section";
import { TopSuppliers } from "@/components/overview/top-suppliers";
import { WelcomeCard } from "@/components/overview/welcome-card";
import { apiGet } from "@/lib/api";
import { requirePage } from "@/lib/guard";
import { expenseInsight, supplierInsight } from "@/lib/insight";
import { financeKpi, mixSlices, type KitchenCompleteness, type MenuKpi } from "@/lib/kpi";

export const metadata: Metadata = { title: "Overview · SPPG Internal" };

export default async function OverviewPage({ searchParams }: { searchParams: Promise<{ dapur?: string }> }) {
  const me = await requirePage("/overview");
  // Only a dapur in the caller's own list counts; anything else falls back to "Semua Dapur" (the backend re-checks scope).
  const { dapur } = await searchParams;
  const kitchenId = me.kitchens.find((k) => k.id === dapur)?.id ?? "";
  // SCRUM-97..116: published data only; finance is null for roles without cost clearance.
  const [finance, menu, completeness] = await Promise.all([
    financeKpi(kitchenId),
    apiGet<MenuKpi>(`/kpi/menu${kitchenId && `?kitchenId=${kitchenId}`}`),
    apiGet<{ kitchens: KitchenCompleteness[] }>("/kpi/completeness"),
  ]);
  return (
    <div className="mx-auto max-w-400 space-y-5">
      <WelcomeCard name={me.fullName ?? me.email ?? "Pengguna"} kitchens={me.kitchens} kitchenId={kitchenId} finance={finance} menu={menu} />
      {finance && (
        <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <TopSuppliers suppliers={finance.topSuppliers} insight={supplierInsight(finance)} />
          <ExpenseComposition slices={mixSlices(finance)} total={finance.spend.total} insight={expenseInsight(finance)} />
        </div>
      )}
      <MenuGiziSection menu={menu} />
      <KelengkapanSection kitchens={completeness.kitchens} />
    </div>
  );
}
