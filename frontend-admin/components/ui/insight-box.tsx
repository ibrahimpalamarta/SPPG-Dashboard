import { Sparkles } from "lucide-react";

/** SCRUM-149: every box carries one; the text comes from lib/insight.ts. */
export function InsightBox({ children }: { children: string }) {
  return (
    <div className="mt-3 rounded-lg border border-emerald-100/80 bg-emerald-50/40 p-2.5 text-xs text-slate-700">
      <div className="mb-1 flex items-center gap-1.5 font-medium text-emerald-800">
        <Sparkles className="size-3.5 text-emerald-600" aria-hidden="true" />
        <span>AI Insight</span>
      </div>
      <p className="leading-relaxed">{children}</p>
    </div>
  );
}
