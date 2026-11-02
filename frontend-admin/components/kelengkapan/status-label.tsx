import { CircleCheck, CircleX, Minus } from "lucide-react";
import type { Tone } from "@/components/ui/badge";

// Three marks only: green check = data is in, red cross = error, grey dash = nothing yet.
const kind = (tone: Tone) => (tone === "red" ? "error" : tone === "pending" || tone === "slate" ? "none" : "ok");

const icons = {
  ok: <CircleCheck className="size-5 fill-green-600 stroke-white" aria-hidden="true" />,
  error: <CircleX className="size-5 fill-red-600 stroke-white" aria-hidden="true" />,
  none: <Minus className="size-4 text-slate-400" aria-hidden="true" />,
};

/** Icon with its text; `hideText` keeps the text for screen readers and the tooltip only. */
export function StatusLabel({ tone, children, hideText }: { tone: Tone; children: string; hideText?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-sm text-slate-700" title={hideText ? children : undefined}>
      {icons[kind(tone)]}
      <span className={hideText ? "sr-only" : undefined}>{children}</span>
    </span>
  );
}
