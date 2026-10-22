import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { requirePage } from "@/lib/guard";

export const metadata: Metadata = { title: "Finance & Cost · SPPG Internal" };

export default async function Page() {
  await requirePage("/finance");
  return (
    <EmptyState title="Finance & Cost belum tersedia">
      <p>Biaya rencana per porsi (berbasis RAB), Top 5 belanja, komposisi pengeluaran, dan saldo akan tampil setelah data keuangan dipublikasikan.</p>
    </EmptyState>
  );
}
