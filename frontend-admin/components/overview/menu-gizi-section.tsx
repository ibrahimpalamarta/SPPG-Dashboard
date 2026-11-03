import { getT } from "@/lib/lang-server";
import { NutritionInfo } from "@/components/overview/nutrition-info";
import { Section } from "@/components/overview/section";
import { TopMenu } from "@/components/overview/top-menu";
import { dateLabel, type MenuKpi } from "@/lib/kpi";

export async function MenuGiziSection({ menu }: { menu: MenuKpi }) {
  const t = await getT();
  return (
    <Section
      title={t("Menu, Gizi & Porsi")}
      action={menu.window && <span className="text-sm text-slate-500">{t("Periode")}: {dateLabel(menu.window.from)} – {dateLabel(menu.window.to)}</span>}
    >
      <TopMenu menus={menu.topMenus} />
      <NutritionInfo menu={menu} />
    </Section>
  );
}
