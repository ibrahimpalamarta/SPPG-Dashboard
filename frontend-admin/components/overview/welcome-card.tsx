import { AlertTriangle, ArrowRight, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { DismissibleBanner } from "@/components/ui/dismissible-banner";
import { SelectButton } from "@/components/ui/select-button";
import { StatCard } from "@/components/overview/stat-card";
import { filters, stats } from "@/lib/mock/overview";

export function WelcomeCard({ name }: { name: string }) {
  return (
    <Card className="p-6 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Selamat datang kembali, {name}!</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {filters.map((label) => (
            <SelectButton key={label} label={label} />
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 empty:hidden">
        <DismissibleBanner tone="info" icon={<Info className="size-5 shrink-0 text-emerald-700" aria-hidden="true" />}>
          <p className="min-w-0 flex-1">
            <strong className="text-slate-900">Demo engineering W2 November.</strong> Data operasional mengunggah &amp; memvalidasi, Project Manager MBG mereview lalu publish.
          </p>
          <button className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-medium text-slate-700">Lihat Skenario UAT</button>
        </DismissibleBanner>
        <DismissibleBanner tone="warning" icon={<AlertTriangle className="size-5 shrink-0 text-amber-600" aria-hidden="true" />}>
          <p className="flex-1">
            <strong>Cashflow P14 belum dipublish.</strong> Angka keuangan memakai periode terakhir yang sudah disetujui (P13).
          </p>
          <button className="font-semibold text-emerald-700">
            Unggah sekarang <ArrowRight className="ml-1 inline size-4" aria-hidden="true" />
          </button>
        </DismissibleBanner>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>
    </Card>
  );
}
