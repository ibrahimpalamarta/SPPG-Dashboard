import type { Metadata } from "next";
import { Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { UploadHistory } from "@/components/unggah/upload-history";

export const metadata: Metadata = { title: "Unggah Data · SPPG Internal" };

export default function UnggahDataPage() {
  return (
    <div className="mx-auto max-w-400">
      <Card className="p-6 sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Unggah Data</h1>
        <p className="mt-2 text-sm text-slate-500 sm:text-base">Unggah file Excel dari dapur. Sistem akan membaca dan mengecek isinya.</p>

        <div className="mt-6 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
          <Lock className="size-5 shrink-0 text-slate-400" aria-hidden="true" />
          <p>
            <strong className="text-slate-900">Project Manager MBG</strong> tidak mengunggah file. Data Operasional yang mengunggah. Anda cukup mengecek dan menyetujui di Mapping &amp; Validasi.
          </p>
        </div>

        <UploadHistory />
      </Card>
    </div>
  );
}
