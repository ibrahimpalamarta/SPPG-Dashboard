import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { requirePage } from "@/lib/guard";

export const metadata: Metadata = { title: "Mapping & Validasi · SPPG Internal" };

export default async function Page() {
  await requirePage("/mapping-validasi");
  return (
    <EmptyState title="Mapping & Validasi belum tersedia">
      <p>Hasil pemetaan kolom berkas ke data standar, normalisasi otomatis, serta temuan blocker dan peringatan akan tampil di sini.</p>
    </EmptyState>
  );
}
