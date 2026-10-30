import { Sparkles } from "lucide-react";

/** SCRUM-158: quiet by design; callers render it only when there is something to say. */
export function InsightBox({ children }: { children: string }) {
  return (
    <div className="mt-3 rounded-lg border border-emerald-100/80 bg-emerald-50/40 p-2.5 text-xs text-slate-700">
      <div className="mb-1 flex items-center gap-1.5 font-medium text-emerald-800">
        <Sparkles className="size-3.5 text-emerald-600" aria-hidden="true" />
        <span>Insight</span>
      </div>
      <p className="leading-relaxed">{children}</p>
    </div>
  );
}
