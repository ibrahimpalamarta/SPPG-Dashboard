"use client";

import { useState } from "react";
import { KitchenDetail } from "@/components/kelengkapan/kitchen-detail";
import { StatusMatrix } from "@/components/kelengkapan/status-matrix";
import type { KitchenCompleteness } from "@/lib/kpi";

/** Admin view: the all-dapur matrix; picking a row opens that dapur's detail below it. */
export function KitchenBoard({ kitchens }: { kitchens: KitchenCompleteness[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <>
      <StatusMatrix kitchens={kitchens} selected={selected} onSelect={setSelected} />
      <KitchenDetail kitchen={kitchens.find((k) => k.name === selected)} />
    </>
  );
}
