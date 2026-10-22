import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { requirePage } from "@/lib/guard";

export const metadata: Metadata = { title: "Data Health · SPPG Internal" };

export default async function Page() {
  await requirePage("/kesehatan-data");
  return (
    <EmptyState title="Data Health belum tersedia">
      <p>Status kelengkapan laporan per dapur, antrean validasi, dan versi mapping yang aktif akan tampil di sini.</p>
    </EmptyState>
  );
}
