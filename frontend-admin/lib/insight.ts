import { pct, rp, type FinanceKpi, type MenuKpi } from "@/lib/kpi";

/**
 * SCRUM-158: an insight is one or two sentences, finding first with its number,
 * ending in a recommended action. Each rule returns undefined unless the data
 * is actually off, so a healthy card shows no insight at all.
 */

/** One supplier above this share of external spend is a dependency worth flagging. */
const SUPPLIER_DOMINANCE = 0.4;
/** Balance covering fewer days of average spend than this is a cash risk. */
const MIN_RUNWAY_DAYS = 7;

export function supplierInsight(finance: FinanceKpi): string | undefined {
  const top = finance.topSuppliers[0];
  if (!top || top.share < SUPPLIER_DOMINANCE) return undefined;
  return `${top.name} menyumbang ${pct(top.share)} belanja eksternal (${rp(top.amount)}). Pertimbangkan pembanding supplier lain untuk mengurangi ketergantungan.`;
}

export function expenseInsight(finance: FinanceKpi): string | undefined {
  const { amount } = finance.expenseMix.unmapped;
  if (amount <= 0 || !finance.spend.total) return undefined;
  return `${pct(amount / finance.spend.total)} pengeluaran (${rp(amount)}) belum dipetakan ke kategori. Lengkapi pemetaan kategori agar komposisi akurat.`;
}

export function runwayInsight(finance: FinanceKpi, balance: number): string | undefined {
  const { perDay } = finance.spend;
  if (!perDay || finance.balance.status === "UNAVAILABLE") return undefined;
  const days = Math.floor(balance / perDay);
  if (days >= MIN_RUNWAY_DAYS) return undefined;
  return `Saldo ${rp(balance)} hanya setara ${days} hari belanja (rata-rata ${rp(perDay)}/hari). Segera pastikan pencairan dana berikutnya.`;
}

export function portionsInsight(portions: NonNullable<MenuKpi["portions"]>): string | undefined {
  if (portions.status !== "MISMATCH") return undefined;
  return "Total penerima manfaat antar segmen tidak cocok dengan jumlah keseluruhan. Periksa kembali data jumlah penerima manfaat sebelum dipublish.";
}
