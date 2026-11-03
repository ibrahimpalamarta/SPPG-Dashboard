import type { T } from "@/lib/lang";
import { dateLabel, periodSpend, pct, rp, type FinanceKpi, type KitchenCompleteness, type MenuKpi } from "@/lib/kpi";

/**
 * SCRUM-158/149: an insight is one or two sentences, finding first with its
 * number, ending in a recommended action. Every box always has one: a healthy
 * box reports its finding, a box without published data encourages completing
 * it. Numbers come from published data only, no invented targets.
 */

/** One supplier above this share of external spend is a dependency worth flagging. */
const SUPPLIER_DOMINANCE = 0.4;
/** Balance covering fewer days of average spend than this is a cash risk. */
const MIN_RUNWAY_DAYS = 7;

const count = new Intl.NumberFormat("id-ID");

export function supplierInsight(t: T, finance: FinanceKpi): string {
  const top = finance.topSuppliers[0];
  if (!top) return t("Belum ada data belanja yang dipublish. Unggah dan publish data belanja agar peringkat supplier bisa dianalisis.");
  if (top.share >= SUPPLIER_DOMINANCE) return t("{name} menyumbang {share} belanja eksternal ({amount}). Pertimbangkan pembanding supplier lain untuk mengurangi ketergantungan.", { name: top.name, share: pct(top.share), amount: rp(top.amount) });
  return t("{name} supplier terbesar dengan {share} belanja eksternal ({amount}), sebaran belanja masih seimbang. Pertahankan pembanding harga antar supplier secara berkala.", { name: top.name, share: pct(top.share), amount: rp(top.amount) });
}

export function expenseInsight(t: T, finance: FinanceKpi): string {
  const { total } = finance.spend;
  const { categories, unmapped } = finance.expenseMix;
  if (!total) return t("Belum ada data pengeluaran yang dipublish. Unggah dan publish data belanja agar komposisi pengeluaran bisa dianalisis.");
  if (unmapped.amount > 0) return t("{share} pengeluaran ({amount}) belum dipetakan ke kategori. Lengkapi pemetaan kategori agar komposisi akurat.", { share: pct(unmapped.amount / total), amount: rp(unmapped.amount) });
  const top = categories.reduce((a, b) => (b.amount > a.amount ? b : a), categories[0]);
  return t("{category} kategori terbesar ({share} dari {total}) dan seluruh pengeluaran sudah terpetakan. Tinjau kategori ini lebih dulu untuk peluang efisiensi.", { category: top.category, share: pct(top.share), total: rp(total) });
}

export function runwayInsight(t: T, finance: FinanceKpi, balance: number): string {
  const { perDay } = finance.spend;
  if (finance.balance.status === "UNAVAILABLE") return t("Belum ada data saldo rekening. Lengkapi data saldo agar kecukupan dana bisa dipantau.");
  if (!perDay) return t("Saldo {balance} belum bisa dibandingkan dengan belanja karena belum ada data belanja harian. Lengkapi data belanja untuk melihat kecukupan dana.", { balance: rp(balance) });
  const days = Math.floor(balance / perDay);
  if (days < MIN_RUNWAY_DAYS) return t("Saldo {balance} hanya setara {days} hari belanja (rata-rata {perDay}/hari). Segera pastikan pencairan dana berikutnya.", { balance: rp(balance), days, perDay: rp(perDay) });
  return t("Saldo {balance} setara {days} hari belanja (rata-rata {perDay}/hari). Pantau saldo secara rutin dan jadwalkan pencairan dana berikutnya.", { balance: rp(balance), days, perDay: rp(perDay) });
}

export function efiInsight(t: T, finance: FinanceKpi): string {
  const { latest } = finance.efi;
  if (!latest) return t("Belum ada data transfer EFI. Lengkapi data transfer agar penerimaan dana bisa dipantau.");
  if (latest.amount === null) return t("Transfer EFI terakhir ({date}) belum punya nominal. Lengkapi nominal transfer agar penerimaan dana bisa dipantau.", { date: dateLabel(latest.date) });
  const { perDay } = finance.spend;
  if (!perDay) return t("Transfer EFI terakhir {amount} pada {date}. Lengkapi data belanja untuk membandingkannya dengan kebutuhan harian.", { amount: rp(latest.amount), date: dateLabel(latest.date) });
  return t("Transfer EFI terakhir {amount} pada {date}, setara {days} hari belanja (rata-rata {perDay}/hari). Pantau jadwal transfer berikutnya agar dana tetap tersedia.", { amount: rp(latest.amount), date: dateLabel(latest.date), days: latest.amount < perDay ? t("kurang dari 1") : Math.floor(latest.amount / perDay), perDay: rp(perDay) });
}

export function periodSpendInsight(t: T, finance: FinanceKpi, period: string): string {
  const { total, days } = periodSpend(finance);
  const when = period.toLowerCase();
  if (!days) return t("Belum ada data pengeluaran {when} yang dipublish. Unggah dan publish data belanja {when} agar pengeluaran bisa dipantau.", { when });
  return t("Pengeluaran {when} {total} dalam {days} hari belanja (rata-rata {perDay}/hari). Pantau belanja harian agar tetap terkendali.", { when, total: rp(total), days, perDay: rp(total / days) });
}

export function portionsInsight(t: T, portions: NonNullable<MenuKpi["portions"]>): string {
  if (portions.status === "MISMATCH") return t("Total penerima manfaat antar segmen tidak cocok dengan jumlah keseluruhan. Periksa kembali data jumlah penerima manfaat sebelum dipublish.");
  if (portions.status === "MISSING" || portions.actual === null || portions.perDay === null) return t("Belum ada data penerima manfaat yang dipublish. Unggah data porsi tersalurkan agar jumlah penerima manfaat tampil.");
  const top = portions.segments.reduce<{ segment: string; actual: number } | null>((a, s) => (s.actual !== null && (!a || s.actual > a.actual) ? { segment: s.segment, actual: s.actual } : a), null);
  const lead = top && portions.actual ? t("; segmen terbesar {segment} ({share})", { segment: top.segment, share: pct(top.actual / portions.actual) }) : "";
  return t("Rata-rata {perDay} penerima manfaat per hari dari {actual} porsi tersalurkan{lead}. Jaga data tiap segmen tetap diperbarui agar angka akurat.", { perDay: count.format(portions.perDay), actual: count.format(portions.actual), lead });
}

export function topMenuInsight(t: T, menus: MenuKpi["topMenus"]): string {
  const top = menus[0];
  if (!top) return t("Belum ada data menu yang dipublish. Unggah dan publish data menu agar peringkat menu bisa dianalisis.");
  return t("{name} paling sering disajikan, {days} hari dalam periode ({kitchens}). Pertimbangkan rotasi menu agar variasi dan gizi tetap beragam.", { name: top.name, days: top.days, kitchens: top.kitchens.join(", ") });
}

export function nutritionInsight(t: T, nutrition: MenuKpi["nutrition"]): string {
  if (nutrition.length === 0) return t("Belum ada data gizi yang dipublish. Unggah dan publish data menu beserta nilai gizinya agar gizi per porsi bisa dianalisis.");
  const incomplete = nutrition.reduce((n, s) => n + s.incompleteDays, 0);
  if (incomplete > 0) return t("{incomplete} hari-segmen punya nilai gizi kosong sehingga tidak ikut dirata-rata. Lengkapi nilai gizi menu agar rata-rata per porsi akurat.", { incomplete });
  const energy = nutrition.flatMap(({ segment, perPortion }) => (perPortion.energyKcal === null ? [] : [`${segment} ${count.format(Math.round(perPortion.energyKcal))} ${t("kkal")}`]));
  if (energy.length === 0) return t("Nilai energi per porsi belum terisi. Lengkapi nilai gizi menu agar rata-rata per porsi bisa dianalisis.");
  return t("Energi rata-rata per porsi: {energy}. Pastikan komposisi menu tetap sesuai kebutuhan gizi tiap segmen.", { energy: energy.join(", ") });
}

export function kitchenInsight(t: T, kitchens: KitchenCompleteness[]): string {
  const sorted = [...kitchens].sort((a, b) => a.percent - b.percent);
  const low = sorted[0];
  const high = sorted[sorted.length - 1];
  if (low.percent >= 100) return t("Seluruh {count} dapur sudah 100% lengkap. Pertahankan pembaruan data secara berkala.", { count: kitchens.length });
  if (kitchens.length === 1) return t("Kelengkapan data {name} {percent}% ({complete} dari {total} data wajib). Lengkapi data yang belum masuk.", { name: low.name, percent: low.percent, complete: low.complete, total: low.total });
  return t("Kelengkapan terendah {low} ({lowPercent}%), tertinggi {high} ({highPercent}%). Prioritaskan pelengkapan data di {low}.", { low: low.name, lowPercent: low.percent, high: high.name, highPercent: high.percent });
}
