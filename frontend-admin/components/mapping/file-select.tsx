"use client";

import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";

/** The file chip is the picker: same look as SelectButton, switching the batch via ?batch=. */
export function FileSelect({ value, options }: { value: string; options: { id: string; label: string }[] }) {
  const router = useRouter();
  return (
    <label className="relative inline-flex">
      <span className="sr-only">Pilih file</span>
      <select
        value={value}
        onChange={(e) => router.push(`/mapping-validasi?batch=${e.target.value}`)}
        className="h-10 max-w-full min-w-44 appearance-none truncate rounded-xl border border-slate-200 bg-white pl-3 pr-10 text-sm font-medium text-slate-700 hover:border-emerald-300"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-3 size-4 text-slate-400" aria-hidden="true" />
    </label>
  );
}
