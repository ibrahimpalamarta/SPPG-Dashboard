export type Tone = "pending" | "amber" | "blue" | "violet" | "green" | "red" | "slate";

const tones: Record<Tone, string> = {
  pending: "border-dashed border-red-300 bg-red-50 text-red-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  blue: "border-transparent bg-slate-100 text-slate-600",
  violet: "border-transparent bg-slate-100 text-slate-600",
  green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  red: "border-red-200 bg-red-50 text-red-700",
  slate: "border-transparent bg-slate-100 text-slate-600",
};

export function Badge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <span className={`inline-flex h-6 items-center whitespace-nowrap rounded-md border px-2 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}
