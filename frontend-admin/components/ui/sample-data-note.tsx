import { getT } from "@/lib/lang-server";

/** Honest label for pages still drawn from static sample data (no mart rows are published yet). */
export async function SampleDataNote() {
  const t = await getT();
  return (
    <p role="note" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
      {t("Tampilan contoh: angka di bagian ini masih data statis, belum berasal dari data dapur yang dipublikasikan.")}
    </p>
  );
}
