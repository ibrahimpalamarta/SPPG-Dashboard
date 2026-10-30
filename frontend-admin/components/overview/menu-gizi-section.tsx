import { NutritionInfo } from "@/components/overview/nutrition-info";
import { Section } from "@/components/overview/section";
import { TopMenu } from "@/components/overview/top-menu";
import { dateLabel, type MenuKpi } from "@/lib/kpi";

export function MenuGiziSection({ menu }: { menu: MenuKpi }) {
  return (
    <Section
      title="Menu, Gizi & Porsi"
      action={menu.window && <span className="text-sm text-slate-500">Periode: {dateLabel(menu.window.from)} – {dateLabel(menu.window.to)}</span>}
    >
      <TopMenu menus={menu.topMenus} />
      <NutritionInfo menu={menu} />
    </Section>
  );
}
