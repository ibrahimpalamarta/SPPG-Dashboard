import type { Metadata } from "next";
import { KitchenBoard } from "@/components/kelengkapan/kitchen-board";
import { KitchenDetail } from "@/components/kelengkapan/kitchen-detail";
import { Card } from "@/components/ui/card";
import { apiGet } from "@/lib/api";
import { getT } from "@/lib/lang-server";
import { getLang } from "@/lib/lang-server";
import { requirePage } from "@/lib/guard";
import { statsOf } from "@/lib/kelengkapan";
import type { KitchenCompleteness } from "@/lib/kpi";

export async function generateMetadata(): Promise<Metadata> {
  return { title: `${(await getT())("Kelengkapan Data")} · SPPG Internal` };
}

export default async function KelengkapanPage() {
  const [me, t, lang] = await Promise.all([requirePage("/kesehatan-data"), getT(), getLang()]);
  // The backend already limits this to the caller's dapur scope.
  const { kitchens } = await apiGet<{ kitchens: KitchenCompleteness[] }>("/kpi/completeness");
  const isAdmin = me.role === "ADMIN";
  return (
    <div className="mx-auto max-w-400">
      <Card className="space-y-6 p-6 sm:p-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{t("Kelengkapan Data")}</h1>
        </div>

        {isAdmin ? (
          <>
            <Card className="grid divide-y divide-slate-200 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
              {statsOf(t, lang, kitchens).map(({ icon: Icon, label, value, valueClass }) => (
                <div key={label} className="p-5">
                  <p className="flex items-center gap-2 text-sm text-slate-500">
                    <Icon className="size-4" aria-hidden="true" />
                    {label}
                  </p>
                  <p className={`mt-2 text-2xl font-bold text-slate-900 ${valueClass ?? ""}`}>{value}</p>
                </div>
              ))}
            </Card>
            <KitchenBoard kitchens={kitchens} />
          </>
        ) : (
          <KitchenDetail kitchen={kitchens[0]} />
        )}
      </Card>
    </div>
  );
}
