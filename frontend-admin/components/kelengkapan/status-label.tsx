import { Check, CircleDashed, Hourglass, Minus, Pencil, Send, type LucideIcon } from "lucide-react";
import { Badge, type Tone } from "@/components/ui/badge";

// Shape + muted colour: passive/done states are grey, in-progress states keep a faint tint.
const icons: Record<Exclude<Tone, "red">, { icon: LucideIcon; className: string }> = {
  green: { icon: Check, className: "text-slate-400" },
  pending: { icon: CircleDashed, className: "text-slate-400" },
  slate: { icon: Minus, className: "text-slate-400" },
  blue: { icon: Send, className: "text-blue-500" },
  violet: { icon: Hourglass, className: "text-violet-500" },
  amber: { icon: Pencil, className: "text-amber-500" },
};

// Only "red" (needs action) keeps a badge; every other status is an icon + grey text.
export function StatusLabel({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  if (tone === "red") return <Badge tone="red">{children}</Badge>;
  const { icon: Icon, className } = icons[tone];
  const passive = tone === "green" || tone === "pending" || tone === "slate";
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium ${passive ? "text-slate-400" : "text-slate-600"}`}>
      <Icon className={`size-3.5 ${className}`} aria-hidden="true" />
      {children}
    </span>
  );
}
