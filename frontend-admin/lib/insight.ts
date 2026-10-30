import { dateLabel, monthSpend, pct, rp, type FinanceKpi, type KitchenCompleteness, type MenuKpi } from "@/lib/kpi";

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

export function supplierInsight(finance: FinanceKpi): string {
  const top = finance.topSuppliers[0];
  if (!top) return "Belum ada data belanja yang dipublish. Unggah dan publish data belanja agar peringkat supplier bisa dianalisis.";
  if (top.share >= SUPPLIER_DOMINANCE) return `${top.name} menyumbang ${pct(top.share)} belanja eksternal (${rp(top.amount)}). Pertimbangkan pembanding supplier lain untuk mengurangi ketergantungan.`;
  return `${top.name} supplier terbesar dengan ${pct(top.share)} belanja eksternal (${rp(top.amount)}), sebaran belanja masih seimbang. Pertahankan pembanding harga antar supplier secara berkala.`;
}

export function expenseInsight(finance: FinanceKpi): string {
  const { total } = finance.spend;
  const { categories, unmapped } = finance.expenseMix;
  if (!total) return "Belum ada data pengeluaran yang dipublish. Unggah dan publish data belanja agar komposisi pengeluaran bisa dianalisis.";
  if (unmapped.amount > 0) return `${pct(unmapped.amount / total)} pengeluaran (${rp(unmapped.amount)}) belum dipetakan ke kategori. Lengkapi pemetaan kategori agar komposisi akurat.`;
  const top = categories.reduce((a, b) => (b.amount > a.amount ? b : a), categories[0]);
  return `${top.category} kategori terbesar (${pct(top.share)} dari ${rp(total)}) dan seluruh pengeluaran sudah terpetakan. Tinjau kategori ini lebih dulu untuk peluang efisiensi.`;
}

export function runwayInsight(finance: FinanceKpi, balance: number): string {
  const { perDay } = finance.spend;
  if (finance.balance.status === "UNAVAILABLE") return "Belum ada data saldo rekening. Lengkapi data saldo agar kecukupan dana bisa dipantau.";
  if (!perDay) return `Saldo ${rp(balance)} belum bisa dibandingkan dengan belanja karena belum ada data belanja harian. Lengkapi data belanja untuk melihat kecukupan dana.`;
  const days = Math.floor(balance / perDay);
  if (days < MIN_RUNWAY_DAYS) return `Saldo ${rp(balance)} hanya setara ${days} hari belanja (rata-rata ${rp(perDay)}/hari). Segera pastikan pencairan dana berikutnya.`;
  return `Saldo ${rp(balance)} setara ${days} hari belanja (rata-rata ${rp(perDay)}/hari). Pantau saldo secara rutin dan jadwalkan pencairan dana berikutnya.`;
}

export function efiInsight(finance: FinanceKpi): string {
  const { latest } = finance.efi;
  if (!latest) return "Belum ada data transfer EFI. Lengkapi data transfer agar penerimaan dana bisa dipantau.";
  if (latest.amount === null) return `Transfer EFI terakhir (${dateLabel(latest.date)}) belum punya nominal. Lengkapi nominal transfer agar penerimaan dana bisa dipantau.`;
  const { perDay } = finance.spend;
  if (!perDay) return `Transfer EFI terakhir ${rp(latest.amount)} pada ${dateLabel(latest.date)}. Lengkapi data belanja untuk membandingkannya dengan kebutuhan harian.`;
  return `Transfer EFI terakhir ${rp(latest.amount)} pada ${dateLabel(latest.date)}, setara ${latest.amount < perDay ? "kurang dari 1" : Math.floor(latest.amount / perDay)} hari belanja (rata-rata ${rp(perDay)}/hari). Pantau jadwal transfer berikutnya agar dana tetap tersedia.`;
}

export function monthSpendInsight(finance: FinanceKpi): string {
  const { total, days } = monthSpend(finance);
  if (!days) return "Belum ada data pengeluaran bulan ini yang dipublish. Unggah dan publish data belanja bulan ini agar pengeluaran bisa dipantau.";
  return `Pengeluaran bulan ini ${rp(total)} dalam ${days} hari belanja (rata-rata ${rp(total / days)}/hari). Pantau belanja harian agar tetap terkendali.`;
}

export function portionsInsight(portions: NonNullable<MenuKpi["portions"]>): string {
  if (portions.status === "MISMATCH") return "Total penerima manfaat antar segmen tidak cocok dengan jumlah keseluruhan. Periksa kembali data jumlah penerima manfaat sebelum dipublish.";
  if (portions.status === "MISSING" || portions.actual === null || portions.perDay === null) return "Belum ada data penerima manfaat yang dipublish. Unggah data porsi tersalurkan agar jumlah penerima manfaat tampil.";
  const top = portions.segments.reduce<{ segment: string; actual: number } | null>((a, s) => (s.actual !== null && (!a || s.actual > a.actual) ? { segment: s.segment, actual: s.actual } : a), null);
  const lead = top && portions.actual ? `; segmen terbesar ${top.segment} (${pct(top.actual / portions.actual)})` : "";
  return `Rata-rata ${count.format(portions.perDay)} penerima manfaat per hari dari ${count.format(portions.actual)} porsi tersalurkan${lead}. Jaga data tiap segmen tetap diperbarui agar angka akurat.`;
}

export function topMenuInsight(menus: MenuKpi["topMenus"]): string {
  const top = menus[0];
  if (!top) return "Belum ada data menu yang dipublish. Unggah dan publish data menu agar peringkat menu bisa dianalisis.";
  return `${top.name} paling sering disajikan, ${top.days} hari dalam periode (${top.kitchens.join(", ")}). Pertimbangkan rotasi menu agar variasi dan gizi tetap beragam.`;
}

export function nutritionInsight(nutrition: MenuKpi["nutrition"]): string {
  if (nutrition.length === 0) return "Belum ada data gizi yang dipublish. Unggah dan publish data menu beserta nilai gizinya agar gizi per porsi bisa dianalisis.";
  const incomplete = nutrition.reduce((n, s) => n + s.incompleteDays, 0);
  if (incomplete > 0) return `${incomplete} hari-segmen punya nilai gizi kosong sehingga tidak ikut dirata-rata. Lengkapi nilai gizi menu agar rata-rata per porsi akurat.`;
  const energy = nutrition.flatMap(({ segment, perPortion }) => (perPortion.energyKcal === null ? [] : [`${segment} ${count.format(Math.round(perPortion.energyKcal))} kkal`]));
  if (energy.length === 0) return "Nilai energi per porsi belum terisi. Lengkapi nilai gizi menu agar rata-rata per porsi bisa dianalisis.";
  return `Energi rata-rata per porsi: ${energy.join(", ")}. Pastikan komposisi menu tetap sesuai kebutuhan gizi tiap segmen.`;
}

export function kitchenInsight(kitchens: KitchenCompleteness[]): string {
  const sorted = [...kitchens].sort((a, b) => a.percent - b.percent);
  const low = sorted[0];
  const high = sorted[sorted.length - 1];
  if (low.percent >= 100) return `Seluruh ${kitchens.length} dapur sudah 100% lengkap. Pertahankan pembaruan data secara berkala.`;
  if (kitchens.length === 1) return `Kelengkapan data ${low.name} ${low.percent}% (${low.complete} dari ${low.total} data wajib). Lengkapi data yang belum masuk.`;
  return `Kelengkapan terendah ${low.name} (${low.percent}%), tertinggi ${high.name} (${high.percent}%). Prioritaskan pelengkapan data di ${low.name}.`;
}
