"use server";

import { apiSend } from "@/lib/api";
import type { KpiSource } from "@/lib/kpi";

/** "Lacak Sumber": files behind one Overview card; null when the backend refused or failed. */
export async function kpiSources(kpi: "completeness" | "top-menu" | "nutrition", query: string): Promise<KpiSource[] | null> {
  const res = await apiSend(`/kpi/sources?${new URLSearchParams({ kpi })}${query && `&${query}`}`, "GET");
  return res.ok ? (res.data.sources as KpiSource[]) : null;
}
