"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useLang, useT } from "@/components/i18n-provider";
import { MorphSelect } from "@/components/ui/morph-select";
import { dateLocale } from "@/lib/lang";

const OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "weekly", label: "Weekly" },
  { value: "daily", label: "Daily" },
  { value: "custom", label: "Custom range" },
] as const;

const dateInput = "h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-800";

/**
 * The period lives in the URL (`?periode=&dari=&sampai=`); the page reads it and asks the backend for that range.
 * A custom range shows as "start – end" on the select itself and is edited inside its opened panel.
 */
export function PeriodFilter({ mode, range }: { mode: string; range: Record<string, string> }) {
  const t = useT();
  const locale = dateLocale(useLang());
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [from, setFrom] = useState(range.dateFrom ?? "");
  const [to, setTo] = useState(range.dateTo ?? "");

  const set = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    router.replace(`${pathname}?${next}`);
  };
  const edit = (dari: string, sampai: string) => {
    setFrom(dari);
    setTo(sampai);
    if (dari && sampai && dari <= sampai) set({ periode: "custom", dari, sampai });
  };
  const day = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });

  return (
    <MorphSelect
      label={t("Periode")}
      options={OPTIONS.map((o) => ({ ...o, label: t(o.label) }))}
      value={mode}
      onChange={(periode) => set({ periode, dari: "", sampai: "" })}
      className={mode === "custom" ? "w-80 max-w-full" : "w-44"}
      display={mode === "custom" && range.dateFrom && range.dateTo ? `${day(range.dateFrom)} – ${day(range.dateTo)}` : undefined}
      footer={
        mode === "custom" && (
          <div className="flex items-center gap-2">
            <input type="date" aria-label={t("Dari tanggal")} value={from} onChange={(e) => edit(e.target.value, to)} className={dateInput} />
            <span className="text-slate-500">–</span>
            <input type="date" aria-label={t("Sampai tanggal")} value={to} onChange={(e) => edit(from, e.target.value)} className={dateInput} />
          </div>
        )
      }
    />
  );
}
