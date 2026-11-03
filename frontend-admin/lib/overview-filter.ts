import type { Kitchen } from "@/lib/me";

/** SCRUM-142: what the Overview and Finance filters put in the URL, and how it becomes backend query params. */
type PeriodMode = "monthly" | "weekly" | "daily" | "custom";

const PERIOD_LABEL: Record<PeriodMode, string> = { monthly: "Bulan ini", weekly: "Minggu ini", daily: "Hari ini", custom: "Periode ini" };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type PeriodParams = { periode?: string; dari?: string; sampai?: string };

/** Calendar periods in Jakarta time, ending today; custom needs both dates in order, otherwise it is unbounded. */
export function resolvePeriod({ periode, dari = "", sampai = "" }: PeriodParams) {
  const mode: PeriodMode = periode === "weekly" || periode === "daily" || periode === "custom" ? periode : "monthly";
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
  const monday = new Date(`${today}T00:00:00Z`);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));

  const range: Record<string, string> =
    mode === "monthly"
      ? { dateFrom: `${today.slice(0, 8)}01`, dateTo: today }
      : mode === "weekly"
        ? { dateFrom: monday.toISOString().slice(0, 10), dateTo: today }
        : mode === "daily"
          ? { dateFrom: today, dateTo: today }
          : ISO_DATE.test(dari) && ISO_DATE.test(sampai) && dari <= sampai
            ? { dateFrom: dari, dateTo: sampai }
            : {};
  return { mode, dari, sampai, label: PERIOD_LABEL[mode], range };
}

export const REGION_PREFIX = "daerah:";

export const regionsOf = (kitchens: Kitchen[]) => [...new Set(kitchens.flatMap((k) => (k.cityRegency ? [k.cityRegency] : [])))];

/** `?dapur=` is a kitchen id or `daerah:<city_regency>`; anything outside the caller's own list falls back to "Semua Dapur". */
export function resolveScope(kitchens: Kitchen[], dapur = ""): { value: string; query: Record<string, string> } {
  if (kitchens.some((k) => k.id === dapur)) return { value: dapur, query: { kitchenId: dapur } };
  const region = dapur.startsWith(REGION_PREFIX) ? dapur.slice(REGION_PREFIX.length) : "";
  if (region && regionsOf(kitchens).includes(region)) return { value: dapur, query: { region } };
  return { value: "", query: {} };
}

export function kpiQuery(period: ReturnType<typeof resolvePeriod>, scope?: ReturnType<typeof resolveScope>) {
  const query = new URLSearchParams({ ...scope?.query, ...period.range }).toString();
  return query && `?${query}`;
}
