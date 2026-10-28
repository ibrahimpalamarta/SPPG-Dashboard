import { Card } from "@/components/ui/card";
import { SelectButton } from "@/components/ui/select-button";
import { StatCard } from "@/components/overview/stat-card";
import { filters, stats } from "@/lib/mock/overview";

export function WelcomeCard({ name }: { name: string }) {
  return (
    <Card className="p-6 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Overview · {name}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {filters.map((label) => (
            <SelectButton key={label} label={label} />
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>
    </Card>
  );
}
