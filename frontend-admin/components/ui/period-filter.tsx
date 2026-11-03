"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useT } from "@/components/i18n-provider";
import { MorphSelect } from "@/components/ui/morph-select";
import { resolvePeriod } from "@/lib/overview-filter";

const OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "weekly", label: "Weekly" },
  { value: "daily", label: "Daily" },
  { value: "custom", label: "Custom range" },
] as const;

const dateInput = "h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800";

/** The period lives in the URL (`?periode=&dari=&sampai=`); the page reads it and asks the backend for that range. */
export function PeriodFilter() {
  const t = useT();
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
      <MorphSelect label={t("Periode")} options={OPTIONS.map((o) => ({ ...o, label: t(o.label) }))} value={mode} onChange={(periode) => set({ periode, dari: "", sampai: "" })} className="w-44" />
      {mode === "custom" && (
        <>
          <input type="date" aria-label={t("Dari tanggal")} defaultValue={dari} onChange={(e) => set({ dari: e.target.value })} className={dateInput} />
          <span className="text-slate-500">–</span>
          <input type="date" aria-label={t("Sampai tanggal")} defaultValue={sampai} onChange={(e) => set({ sampai: e.target.value })} className={dateInput} />
        </>
      )}
    </div>
  );
}
