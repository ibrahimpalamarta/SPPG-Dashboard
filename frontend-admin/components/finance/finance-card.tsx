import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SourceLink } from "@/components/ui/source-link";

type Props = { title: string; icon: LucideIcon; badge?: React.ReactNode; sourceAtBottom?: boolean; children: React.ReactNode };

export function FinanceCard({ title, icon: Icon, badge, sourceAtBottom, children }: Props) {
  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-3 text-base font-semibold text-slate-900">
          <Icon className="size-5 text-emerald-600" aria-hidden="true" />
          {title}
          {badge}
        </h2>
        {!sourceAtBottom && <SourceLink />}
      </div>
      <div className="mt-5">{children}</div>
      {sourceAtBottom && (
        <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
          <SourceLink />
        </div>
      )}
    </Card>
  );
}
