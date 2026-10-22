import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { requirePage } from "@/lib/guard";

export const metadata: Metadata = { title: "Overview · SPPG Internal" };

export default async function Page() {
  await requirePage("/overview");
  return (
    <EmptyState title="Overview belum tersedia">
      <p>Ringkasan biaya rencana, total belanja, saldo, dan kelengkapan data akan tampil di sini setelah data dapur pertama dipublikasikan.</p>
    </EmptyState>
  );
}
