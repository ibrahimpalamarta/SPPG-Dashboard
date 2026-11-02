"use client";

import { useState } from "react";
import { KitchenDetail } from "@/components/kelengkapan/kitchen-detail";
import { StatusMatrix } from "@/components/kelengkapan/status-matrix";

/** Admin view: the all-dapur matrix; picking a row opens that dapur's detail below it. */
export function KitchenBoard() {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <>
      <StatusMatrix selected={selected} onSelect={setSelected} />
      <KitchenDetail code={selected} />
    </>
  );
}
