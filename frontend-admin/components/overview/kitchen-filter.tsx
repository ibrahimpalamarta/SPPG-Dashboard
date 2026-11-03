"use client";

import { Warehouse } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MorphSelect } from "@/components/ui/morph-select";
import { REGION_PREFIX, regionsOf } from "@/lib/overview-filter";
import type { Kitchen } from "@/lib/me";

const label = ({ name, rolloutStatus }: Kitchen) => (rolloutStatus === "PHASE_2A" || rolloutStatus === "PHASE_2B" ? `${name} · Phase 2` : name);

/**
 * SCRUM-142/152: a Data Operasional account is bound to one dapur and sees its name; Admin picks
 * "Semua Dapur" (default), a Daerah or one dapur, kept in `?dapur=` so the page reloads with that scope.
 */
export function KitchenFilter({ kitchens, selected }: { kitchens: Kitchen[]; selected: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  if (kitchens.length === 0) return null;
  if (kitchens.length === 1) {
    return (
      <span className="flex h-10 items-center gap-2.5 rounded-xl bg-slate-100 px-4 text-sm font-semibold text-slate-800">
        <Warehouse className="size-4 text-slate-600" aria-hidden="true" />
        {kitchens[0].name}
      </span>
    );
  }
  const regions = regionsOf(kitchens);
  const pick = (dapur: string) => {
    const next = new URLSearchParams(params);
    if (dapur) next.set("dapur", dapur);
    else next.delete("dapur");
    router.replace(`${pathname}?${next}`);
  };
  return (
    <MorphSelect
      label="Dapur"
      className="w-72"
      value={selected}
      options={[
        { value: "", label: "Semua Dapur" },
        ...(regions.length > 1 ? regions.map((r) => ({ value: `${REGION_PREFIX}${r}`, label: `Daerah ${r}` })) : []),
        ...kitchens.map((k) => ({ value: k.id, label: label(k) })),
      ]}
      onChange={pick}
    />
  );
}
