import { BookOpen, Building2, CircleCheck, CircleX, Coins, FileText, Gauge, Package, UserRound, Utensils, Wallet, WalletCards, type LucideIcon } from "lucide-react";
import type { Tone } from "@/components/ui/badge";
import { dateLocale, type Lang, type T } from "@/lib/lang";
import type { CompletenessItem, KitchenCompleteness } from "@/lib/kpi";

type Status = { label: string; tone: Tone };
type Cell = { label: string; status: Status; issue?: Status; publishedAt: string | null; action?: "Buka" };
type Stat = { icon: LucideIcon; label: string; value: string; valueClass?: string };

const s = (label: string, tone: Tone): Status => ({ label, tone });

/** Same order as the backend's items followed by optional (lib/completeness.ts); `*` marks the optional ones. */
export const columns = ["Cashflow", "RAB", "Purchase Order", "Pembayaran Supplier", "Jumlah Penerima Manfaat", "Saldo Rekening", "Master Menu *", "Penerimaan Barang *"];

export const legend: Status[] = [s("Sudah masuk", "green"), s("Error", "red"), s("Belum ada", "slate")];

export const icons: Record<string, LucideIcon> = {
  Cashflow: Wallet,
  RAB: Utensils,
  "Purchase Order": FileText,
  "Pembayaran Supplier": Coins,
  "Jumlah Penerima Manfaat": UserRound,
  "Saldo Rekening": WalletCards,
  "Master Menu": BookOpen,
  "Penerimaan Barang": Package,
};

function cell({ label, state, issue, publishedAt }: CompletenessItem, optional: boolean): Cell {
  const status =
    state === "COMPLETE" ? s("Sudah masuk", "green")
    : issue === "FIX" ? s("Ada error", "red")
    : state === "SENT" ? (issue === "REVIEW" ? s("Belum selesai dicek", "violet") : s("Sedang diproses", "blue"))
    : optional ? s("Opsional", "slate")
    : s("Belum masuk", "pending");
  return {
    label,
    status,
    issue: issue === "FIX" ? s("wajib diperbaiki", "red") : issue === "REVIEW" ? s("perlu dicek", "amber") : undefined,
    publishedAt,
    action: state === "SENT" || issue === "FIX" ? "Buka" : undefined,
  };
}

export const cellsOf = ({ items, optional }: KitchenCompleteness): Cell[] => [...items.map((i) => cell(i, false)), ...optional.map((i) => cell(i, true))];

const NOTES = { PILOT_PHASE_1: "Pilot Phase 1", PHASE_1_COMPARISON: "Pembanding Phase 1", PHASE_2A: "Rollout Phase 2", PHASE_2B: "Readiness Phase 2b" } as const;
const RANK = { PILOT_PHASE_1: 0, PHASE_1_COMPARISON: 1, PHASE_2A: 2, PHASE_2B: 3 } as const;

/** Phase 2 dapur (and one without a rollout stage, e.g. Turen) have no matrix cells yet. */
export const phaseOf = ({ rolloutStatus }: KitchenCompleteness) => (rolloutStatus === "PHASE_2B" ? "Phase 2b" : rolloutStatus === "PILOT_PHASE_1" || rolloutStatus === "PHASE_1_COMPARISON" ? undefined : "Phase 2");
export const noteOf = ({ rolloutStatus }: KitchenCompleteness) => (rolloutStatus ? NOTES[rolloutStatus] : NOTES.PHASE_2A);
export const byRollout = (kitchens: KitchenCompleteness[]) => [...kitchens].sort((a, b) => (a.rolloutStatus ? RANK[a.rolloutStatus] : 4) - (b.rolloutStatus ? RANK[b.rolloutStatus] : 4));

const parts = (lang: Lang) => new Intl.DateTimeFormat(dateLocale(lang), { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Asia/Jakarta" });
/** "03 Nov 2026 16:48" in Jakarta time. */
export function publishedLabel(iso: string, lang: Lang) {
  const p = Object.fromEntries(parts(lang).formatToParts(new Date(iso)).map(({ type, value }) => [type, value]));
  return `${p.day} ${p.month} ${p.year} ${p.hour}:${p.minute}`;
}

export function statsOf(t: T, lang: Lang, kitchens: KitchenCompleteness[]): Stat[] {
  const fix = kitchens.reduce((n, k) => n + k.issues.fix, 0);
  const last = kitchens.flatMap((k) => k.lastPublish ?? []).sort((a, b) => b.at.localeCompare(a.at))[0];
  const average = kitchens.length ? Math.round(kitchens.reduce((n, k) => n + k.percent, 0) / kitchens.length) : 0;
  return [
    { icon: Building2, label: t("Dapur terhubung"), value: `${kitchens.filter((k) => k.sent > 0).length} / ${kitchens.length}` },
    { icon: Gauge, label: t("Kelengkapan rata-rata"), value: `${average}%` },
    { icon: CircleX, label: t("Wajib diperbaiki"), value: String(fix), valueClass: fix ? "text-red-500" : undefined },
    { icon: CircleCheck, label: t("Publish terakhir"), value: last ? `${new Date(`${last.at}T00:00:00`).toLocaleDateString(dateLocale(lang), { day: "2-digit", month: "short" })} · ${t(last.label)}` : "—" },
  ];
}
