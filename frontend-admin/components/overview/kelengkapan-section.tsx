import { getT } from "@/lib/lang-server";
import { KitchenTable } from "@/components/overview/kitchen-table";
import { Section } from "@/components/overview/section";
import { SknCompleteness } from "@/components/overview/skn-completeness";
import type { KitchenCompleteness } from "@/lib/kpi";

export async function KelengkapanSection({ kitchens }: { kitchens: KitchenCompleteness[] }) {
  // A role without any dapur in scope has nothing to complete (SCRUM-152).
  if (!kitchens.length) return null;
  const t = await getT();
  return (
    <Section
      title={t("Kelengkapan Data")}
      action={
        <button className="flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-800">
          {t("Buka Kelengkapan Data")}
        </button>
      }
    >
      <SknCompleteness kitchen={kitchens[0]} />
      <KitchenTable kitchens={kitchens} />
    </Section>
  );
}
