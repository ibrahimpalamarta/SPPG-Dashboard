import { apiSend } from "@/lib/api";

/** Mirrors backend GET /api/kpi/finance (controllers/mart/kpi.ts). Published, non-superseded, TERKONFIRMASI data only. */
export type FinanceKpi = {
  spend: { total: number; transactions: number; perDay: number | null; held: number; missingTotals: number };
  topSuppliers: { name: string; amount: number; share: number }[];
  expenseMix: { categories: { category: string; amount: number; share: number; raw: string[] }[]; unmapped: { amount: number; raw: string[] } };
  daily: { date: string; amount: number }[];
  efi: { latest: EfiTransfer | null; transfers: EfiTransfer[] };
  balance: { status: "DRAFT" | "UNAVAILABLE"; asOf: string | null; accounts: { accountRef: string; balance: number | null; sourceSystem: string }[] };
  plannedCostPerPortion: { enabled: false } | { enabled: true; label: string; formulaVersion: string; value: number | null; incomplete: boolean };
};

export type EfiTransfer = { date: string; amount: number | null; ref: string; description: string | null };

type Nutrients = { energyKcal: number | null; proteinG: number | null; fatG: number | null; carbohydrateG: number | null; fiberG: number | null };

/** Mirrors backend GET /api/kpi/menu. `portions` is absent for roles without cost clearance. */
export type MenuKpi = {
  window: { from: string; to: string } | null;
  topMenus: { name: string; days: number; kitchens: string[] }[];
  nutrition: { segment: string; days: number; incompleteDays: number; perPortion: Nutrients; plannedPortions: number | null }[];
  portions?: { segments: { segment: string; actual: number | null }[]; actual: number | null; perDay: number | null; status: "OK" | "MISSING" | "MISMATCH" };
};

/** Finance KPIs are cost-cleared: a role without clearance gets null, not an error page. */
export async function financeKpi(): Promise<FinanceKpi | null> {
  const res = await apiSend("/kpi/finance", "GET");
  if (res.status === 403) return null;
  if (!res.ok) throw new Error(`GET /kpi/finance → ${res.status}`);
  return res.data as unknown as FinanceKpi;
}

/** Mirrors backend GET /api/kpi/completeness (lib/completeness.ts): one entry per dapur in the caller's scope. */
export type KitchenCompleteness = {
  name: string;
  region: string | null;
  items: { label: string; state: "COMPLETE" | "SENT" | "MISSING" }[];
  complete: number;
  sent: number;
  total: number;
  percent: number;
  issues: { fix: number; review: number };
  lastPublish: { at: string; label: string } | null;
};

/** Red under half, amber until everything is in, green when complete; classes are spelled out so Tailwind keeps them. */
export const completenessColor = (percent: number) =>
  percent >= 100 ? { stroke: "stroke-emerald-500", bar: "bg-emerald-500" } : percent >= 50 ? { stroke: "stroke-amber-500", bar: "bg-amber-500" } : { stroke: "stroke-red-600", bar: "bg-red-600" };

const juta =new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const full = new Intl.NumberFormat("id-ID");
const percent = new Intl.NumberFormat("id-ID", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** "Rp27,1 jt" for millions, "Rp850.000" below. */
export const rp = (n: number) => (Math.abs(n) >= 1e6 ? `Rp${juta.format(n / 1e6)} jt` : `Rp${full.format(n)}`);
export const rpFull = (n: number) => `Rp${full.format(n)}`;
export const pct = (share: number) => percent.format(share);
export const dateLabel = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

/** Donut colours for the expense mix, in rank order; the unmapped slice is always slate. */
const MIX_COLORS = ["#10b981", "#34d399", "#6ee7b7", "#a7f3d0", "#d1fae5"];

export type Slice = { label: string; amount: number; percent: number; color: string; raw: string[]; unmapped?: boolean };

/** SCRUM-99: master categories plus, when present, one flagged "Belum dipetakan" slice so the total still matches spend. */
export function mixSlices(k: FinanceKpi): Slice[] {
  const slices: Slice[] = k.expenseMix.categories.map((c, i) => ({ label: c.category, amount: c.amount, percent: c.share * 100, color: MIX_COLORS[i % MIX_COLORS.length], raw: c.raw }));
  const { amount, raw } = k.expenseMix.unmapped;
  if (amount > 0) slices.push({ label: "Belum dipetakan", amount, percent: k.spend.total ? (amount / k.spend.total) * 100 : 0, color: "#cbd5e1", raw, unmapped: true });
  return slices;
}

export function donutGradient(slices: Slice[]) {
  let start = 0;
  const stops = slices.map(({ percent, color }) => {
    const stop = `${color} ${start}% ${start + percent}%`;
    start += percent;
    return stop;
  });
  return stops.length ? `conic-gradient(${stops.join(", ")})` : "#f1f5f9";
}
