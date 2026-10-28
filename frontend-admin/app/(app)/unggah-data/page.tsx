import { Image as ImageIcon, Lock } from "lucide-react";
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Unggah Data</h1>
        <p className="mt-1 text-slate-500">Unggah file Excel dari dapur. Sistem akan membaca dan mengecek isinya.</p>
      </div>
      {me.role === "SUPER_ADMIN" ? (
        <>
          <p className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
            <Lock className="size-4 shrink-0 text-slate-500" aria-hidden="true" />
            <span><strong>Project Manager MBG</strong> tidak mengunggah file. Data Operasional yang mengunggah. Anda cukup mengecek dan menyetujui di Validasi Data.</span>
          </p>
          <div className="flex items-center gap-4 rounded-xl border border-dashed border-slate-300 bg-white/60 px-4 py-4">
            <span className="flex size-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500">
              <ImageIcon className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-slate-800">Upload Gambar</h2>
              <p className="text-sm text-slate-500">Unggah foto, misalnya nota atau bukti terima barang.</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600">
              <Lock className="size-3.5" aria-hidden="true" />
              Segera (Phase 2)
            </span>
            <button type="button" disabled className="rounded-lg px-3 py-1.5 text-sm text-slate-400">Pilih gambar</button>
          </div>
        </>
      ) : !me.permissions.includes("upload:create") ? (
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
      <UploadHistory canOpen={me.permissions.includes("mapping:view")} />
    </div>
  );
}
