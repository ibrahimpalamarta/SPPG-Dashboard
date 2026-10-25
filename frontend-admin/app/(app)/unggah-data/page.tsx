import type { Metadata } from "next";
import { requirePage } from "@/lib/guard";
import { EmptyState } from "@/components/ui/empty-state";
import { UploadHistory } from "@/components/unggah/upload-history";
import { UploadForm } from "./upload-form";

export const metadata: Metadata = { title: "Unggah Data · SPPG Internal" };

export default async function Page() {
  const me = await requirePage("/unggah-data");

  return (
    <div className="mx-auto max-w-400 space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Unggah Data</h1>
      {!me.permissions.includes("upload:create") ? (
        <EmptyState title="Hanya lihat">
          <p>Peran Anda dapat melihat riwayat unggahan, tetapi tidak dapat mengunggah file.</p>
        </EmptyState>
      ) : me.kitchens.length === 0 ? (
        <EmptyState title="Belum ada dapur">
          <p>Akun Anda belum ditautkan ke dapur mana pun. Hubungi Project Manager MBG.</p>
        </EmptyState>
      ) : (
        <UploadForm kitchens={me.kitchens} kitchenId={me.kitchens[0]?.id} />
      )}
      <UploadHistory />
    </div>
  );
}
