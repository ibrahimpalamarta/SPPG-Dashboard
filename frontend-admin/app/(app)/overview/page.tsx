import type { Metadata } from "next";
import { ExpenseComposition } from "@/components/overview/expense-composition";
import { KelengkapanSection } from "@/components/overview/kelengkapan-section";
import { MenuGiziSection } from "@/components/overview/menu-gizi-section";
import { TopSuppliers } from "@/components/overview/top-suppliers";
import { WelcomeCard } from "@/components/overview/welcome-card";
import { SampleDataNote } from "@/components/ui/sample-data-note";
import { requirePage } from "@/lib/guard";

export const metadata: Metadata = { title: "Overview · SPPG Internal" };

export default async function OverviewPage() {
  const me = await requirePage("/overview");
  return (
    <div className="mx-auto max-w-400 space-y-5">
      <SampleDataNote />
      <WelcomeCard name={me.fullName ?? me.email ?? "Pengguna"} />
      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <TopSuppliers />
        <ExpenseComposition />
      </div>
      <MenuGiziSection />
      <KelengkapanSection />
    </div>
  );
}
