import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { requirePage } from "@/lib/guard";

export const metadata: Metadata = { title: "Unggah Data · SPPG Internal" };

export default async function Page() {
  await requirePage("/unggah-data");
  return (
    <EmptyState title="Unggah Data belum tersedia">
      <p>Unggah berkas laporan dapur (Cashflow, Menu, RAB, PO, dan lainnya) akan tersedia di halaman ini.</p>
    </EmptyState>
  );
}
