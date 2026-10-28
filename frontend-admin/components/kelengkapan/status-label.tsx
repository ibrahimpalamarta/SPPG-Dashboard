import { Check, Circle, CircleDashed, CircleDot, CircleSmall, CircleX, Minus, type LucideIcon } from "lucide-react";
import type { Tone } from "@/components/ui/badge";

// Plain geometric shapes only. Passive/done states are grey; "red" is the single highlighted state.
const styles: Record<Tone, { icon: LucideIcon; icon$: string; text: string }> = {
  green: { icon: Check, icon$: "text-slate-400", text: "text-slate-400" },
  pending: { icon: CircleDashed, icon$: "text-slate-400", text: "text-slate-400" },
  slate: { icon: Minus, icon$: "text-slate-400", text: "text-slate-400" },
  blue: { icon: Circle, icon$: "text-slate-400", text: "text-slate-600" },
  violet: { icon: CircleDot, icon$: "text-slate-400", text: "text-slate-600" },
  amber: { icon: CircleSmall, icon$: "text-amber-500", text: "text-slate-600" },
  red: { icon: CircleX, icon$: "text-red-600", text: "text-red-600 font-semibold" },
};

export function StatusLabel({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  const { icon: Icon, icon$, text } = styles[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium ${text}`}>
      <Icon className={`size-3.5 ${icon$}`} aria-hidden="true" />
      {children}
    </span>
  );
}
