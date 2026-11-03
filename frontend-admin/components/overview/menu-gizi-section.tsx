import { getT } from "@/lib/lang-server";
import { NutritionInfo } from "@/components/overview/nutrition-info";
import { Section } from "@/components/overview/section";
import { TopMenu } from "@/components/overview/top-menu";
import type { MenuKpi } from "@/lib/kpi";

export async function MenuGiziSection({ menu, sourceQuery }: { menu: MenuKpi; sourceQuery: string }) {
  const t = await getT();
  return (
    <Section title={t("Menu, Gizi & Porsi")}>
      <TopMenu menus={menu.topMenus} sourceQuery={sourceQuery} />
      <NutritionInfo menu={menu} sourceQuery={sourceQuery} />
    </Section>
  );
}
