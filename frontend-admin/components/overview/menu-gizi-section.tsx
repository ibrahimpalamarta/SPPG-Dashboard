import { getT } from "@/lib/lang-server";
import { NutritionInfo } from "@/components/overview/nutrition-info";
import { Section } from "@/components/overview/section";
import { TopMenu } from "@/components/overview/top-menu";
import { dateLabel, type MenuKpi } from "@/lib/kpi";

export async function MenuGiziSection({ menu, sourceQuery }: { menu: MenuKpi; sourceQuery: string }) {
  const t = await getT();
  return (
    <Section
      title={t("Menu, Gizi & Porsi")}
      action={menu.window && <span className="text-sm text-slate-600">{t("Periode")}: {dateLabel(menu.window.from)} – {dateLabel(menu.window.to)}</span>}
    >
      <TopMenu menus={menu.topMenus} sourceQuery={sourceQuery} />
      <NutritionInfo menu={menu} sourceQuery={sourceQuery} />
    </Section>
  );
}
