import { Check } from "lucide-react";
import { Badge, type Tone } from "@/components/ui/badge";

const dots: Record<Exclude<Tone, "red" | "green">, string> = {
  pending: "border border-amber-400",
  amber: "bg-amber-500",
  blue: "bg-blue-500",
  violet: "bg-violet-500",
  slate: "bg-slate-400",
};

// Only "red" (needs action) keeps a badge; "green" gets a checkmark, the rest a dot.
export function StatusLabel({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  if (tone === "red") return <Badge tone="red">{children}</Badge>;
  if (tone === "green") {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-emerald-700">
        <Check className="size-3.5" aria-hidden="true" />
        {children}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-slate-600">
      <span className={`size-2 rounded-full ${dots[tone]}`} aria-hidden="true" />
      {children}
    </span>
  );
}
