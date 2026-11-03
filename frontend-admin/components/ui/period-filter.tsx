"use client";

import { useState } from "react";
import { MorphSelect } from "@/components/ui/morph-select";

const OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "weekly", label: "Weekly" },
  { value: "daily", label: "Daily" },
  { value: "custom", label: "Custom range" },
];

const dateInput = "h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800";

/** UI only: the chosen period is not yet applied to the data on the page. */
export function PeriodFilter() {
  const [mode, setMode] = useState("monthly");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <MorphSelect label="Periode" options={OPTIONS} value={mode} onChange={setMode} className="w-44" />
      {mode === "custom" && (
        <>
          <input type="date" aria-label="Dari tanggal" className={dateInput} />
          <span className="text-slate-500">–</span>
          <input type="date" aria-label="Sampai tanggal" className={dateInput} />
        </>
      )}
    </div>
  );
}
