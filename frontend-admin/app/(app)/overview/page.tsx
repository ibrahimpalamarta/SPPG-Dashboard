import type { Metadata } from "next";
import { ExpenseComposition } from "@/components/overview/expense-composition";
import { KelengkapanSection } from "@/components/overview/kelengkapan-section";
import { MenuGiziSection } from "@/components/overview/menu-gizi-section";
import { TopSuppliers } from "@/components/overview/top-suppliers";
import { WelcomeCard } from "@/components/overview/welcome-card";
import { SampleDataNote } from "@/components/ui/sample-data-note";
import { apiGet } from "@/lib/api";
import { requirePage } from "@/lib/guard";
import { expenseInsight, supplierInsight } from "@/lib/insight";
import { financeKpi, mixSlices, type MenuKpi } from "@/lib/kpi";

export const metadata: Metadata = { title: "Overview · SPPG Internal" };

export default async function OverviewPage() {
  const me = await requirePage("/overview");
  // SCRUM-97..116: published data only; finance is null for roles without cost clearance.
  const [finance, menu] = await Promise.all([financeKpi(), apiGet<MenuKpi>("/kpi/menu")]);
  return (
    <div className="mx-auto max-w-400 space-y-5">
      <WelcomeCard name={me.fullName ?? me.email ?? "Pengguna"} finance={finance} menu={menu} />
      {finance && (
        <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <TopSuppliers suppliers={finance.topSuppliers} insight={supplierInsight(finance)} />
          <ExpenseComposition slices={mixSlices(finance)} total={finance.spend.total} insight={expenseInsight(finance)} />
        </div>
      )}
      <MenuGiziSection menu={menu} />
      {/* Kelengkapan Data is Tahap 8 (SCRUM-104): still sample data. */}
      <SampleDataNote />
      <KelengkapanSection />
    </div>
  );
}
