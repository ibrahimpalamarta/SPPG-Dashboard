"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MorphSelect } from "@/components/ui/morph-select";
import { resolvePeriod } from "@/lib/overview-filter";

const OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "weekly", label: "Weekly" },
  { value: "daily", label: "Daily" },
  { value: "custom", label: "Custom range" },
];

const dateInput = "h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800";

/** The period lives in the URL (`?periode=&dari=&sampai=`); the page reads it and asks the backend for that range. */
export function PeriodFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { mode, dari, sampai } = resolvePeriod(Object.fromEntries(params));

  const set = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    router.replace(`${pathname}?${next}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <MorphSelect label="Periode" options={OPTIONS} value={mode} onChange={(periode) => set({ periode, dari: "", sampai: "" })} className="w-44" />
      {mode === "custom" && (
        <>
          <input type="date" aria-label="Dari tanggal" defaultValue={dari} onChange={(e) => set({ dari: e.target.value })} className={dateInput} />
          <span className="text-slate-500">–</span>
          <input type="date" aria-label="Sampai tanggal" defaultValue={sampai} onChange={(e) => set({ sampai: e.target.value })} className={dateInput} />
        </>
      )}
    </div>
  );
}
