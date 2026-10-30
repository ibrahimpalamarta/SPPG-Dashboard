import { ChevronRight } from "lucide-react";
import { KitchenTable } from "@/components/overview/kitchen-table";
import { Section } from "@/components/overview/section";
import { SknCompleteness } from "@/components/overview/skn-completeness";
import type { KitchenCompleteness } from "@/lib/kpi";

export function KelengkapanSection({ kitchens }: { kitchens: KitchenCompleteness[] }) {
  // A role without any dapur in scope has nothing to complete (SCRUM-152).
  if (!kitchens.length) return null;
  return (
    <Section
      title="Kelengkapan Data"
      action={
        <button className="flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900">
          Buka Kelengkapan Data <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      }
    >
      <SknCompleteness kitchen={kitchens[0]} />
      <KitchenTable kitchens={kitchens} />
    </Section>
  );
}
