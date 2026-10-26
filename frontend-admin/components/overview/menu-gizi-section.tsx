import { NutritionInfo } from "@/components/overview/nutrition-info";
import { Section } from "@/components/overview/section";
import { TopMenu } from "@/components/overview/top-menu";
import { SelectButton } from "@/components/ui/select-button";
import { filters } from "@/lib/mock/menu-gizi";

export function MenuGiziSection() {
  return (
    <Section
      title="Menu, Gizi & Porsi"
      action={
        <div className="flex flex-wrap gap-2">
          {filters.map((label) => (
            <SelectButton key={label} label={label} />
          ))}
        </div>
      }
    >
      <TopMenu />
      <NutritionInfo />
    </Section>
  );
}
