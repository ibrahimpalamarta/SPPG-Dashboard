export type Tone = "pending" | "amber" | "blue" | "violet" | "green" | "red" | "slate";

const tones: Record<Tone, string> = {
  pending: "border-dashed border-amber-300 bg-amber-50 text-amber-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  violet: "border-violet-200 bg-violet-50 text-violet-700",
  green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  red: "border-red-200 bg-red-50 text-red-700",
  slate: "border-transparent bg-slate-100 text-slate-500",
};

export function Badge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <span className={`inline-flex whitespace-nowrap rounded-md border px-2 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}
