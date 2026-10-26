import { ChevronDown } from "lucide-react";

export function SelectButton({ label }: { label: string }) {
  return (
    <button className="flex h-10 min-w-44 items-center justify-between gap-5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:border-emerald-300">
      {label}
      <ChevronDown className="size-4 text-slate-400" aria-hidden="true" />
    </button>
  );
}
