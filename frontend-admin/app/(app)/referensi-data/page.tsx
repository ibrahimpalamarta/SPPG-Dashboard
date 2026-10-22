import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { requirePage } from "@/lib/guard";

export const metadata: Metadata = { title: "Data Reference · SPPG Internal" };

export default async function Page() {
  await requirePage("/referensi-data");
  return (
    <EmptyState title="Data Reference belum tersedia">
      <p>Master dapur, dataset standar, dan profil mapping akan dapat dilihat di sini.</p>
    </EmptyState>
  );
}
