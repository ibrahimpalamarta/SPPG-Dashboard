import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { DetailLink } from "@/components/ui/detail-link";
import { SourceLink } from "@/components/ui/source-link";

export function Panel({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-3 text-base font-semibold text-slate-900">
          <Icon className="size-5 text-emerald-600" aria-hidden="true" />
          {title}
        </h2>
        <DetailLink />
      </div>
      <div className="mt-6">{children}</div>
      <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
        <SourceLink />
      </div>
    </Card>
  );
}
