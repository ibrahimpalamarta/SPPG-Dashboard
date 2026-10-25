import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { requirePage } from "@/lib/guard";

export const metadata: Metadata = { title: "Manual / Quick Entry · SPPG Internal" };

export default async function Page() {
  await requirePage("/input-manual");
  return (
    <EmptyState title="Input manual nonaktif">
      <p>Input manual adalah fallback terkontrol: hanya untuk data yang belum punya sumber berkas yang andal, dan setiap entri wajib direview.</p>
      <p>Gunakan halaman Unggah Data untuk laporan yang sudah dibuat dapur. Formulir ini belum diaktifkan.</p>
    </EmptyState>
  );
}
