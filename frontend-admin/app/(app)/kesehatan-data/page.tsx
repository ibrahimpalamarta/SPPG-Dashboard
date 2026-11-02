import type { Metadata } from "next";
import { KitchenDetail } from "@/components/kelengkapan/kitchen-detail";
import { KitchenBoard } from "@/components/kelengkapan/kitchen-board";
import { Card } from "@/components/ui/card";
import { SampleDataNote } from "@/components/ui/sample-data-note";
import { requirePage } from "@/lib/guard";
import { stats } from "@/lib/mock/kelengkapan-data";

export const metadata: Metadata = { title: "Kelengkapan Data · SPPG Internal" };

export default async function KelengkapanPage() {
  const me = await requirePage("/kesehatan-data");
  const isAdmin = me.role === "ADMIN";
  return (
    <div className="mx-auto max-w-400">
      <SampleDataNote />
      <Card className="space-y-6 p-6 sm:p-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Kelengkapan Data</h1>
        </div>

        {isAdmin ? (
          <>
            <Card className="grid divide-y divide-slate-200 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
              {stats.map(({ icon: Icon, label, value, valueClass }) => (
                <div key={label} className="p-5">
                  <p className="flex items-center gap-2 text-sm text-slate-500">
                    <Icon className="size-4" aria-hidden="true" />
                    {label}
                  </p>
                  <p className={`mt-2 text-2xl font-bold text-slate-900 ${valueClass ?? ""}`}>{value}</p>
                </div>
              ))}
            </Card>
            <KitchenBoard />
          </>
        ) : (
          <KitchenDetail code={me.kitchens[0]?.code ?? null} />
        )}
      </Card>
    </div>
  );
}
