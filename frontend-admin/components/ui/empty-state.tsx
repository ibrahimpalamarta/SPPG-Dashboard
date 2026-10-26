import type { ReactNode } from "react";

/**
 * The one "nothing here yet" state. Pages without a feature render this
 * instead of placeholder numbers — the PRD forbids fake figures (missing ≠ 0).
 */
export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mx-auto max-w-2xl rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <h1 className="text-lg font-semibold text-slate-800">{title}</h1>
      <div className="mt-2 space-y-2 text-sm text-slate-500">{children}</div>
    </section>
  );
}
