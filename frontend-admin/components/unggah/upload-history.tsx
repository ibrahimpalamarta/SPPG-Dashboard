import { Download, FileText } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { StatusBadge, DOMAINS } from "@/lib/upload";
import { apiGet } from "@/lib/api";

type Batch = {
  id: string;
  publicId: string;
  storageKey: string | null;
  fileName: string;
  domain: string;
  status: string;
  errorCode: string | null;
  mappingProfileId: string | null;
  validatedAt: string | null;
  publishedAt: string | null;
  uploadDate: string;
  kitchen: { code: string | null; name: string };
  uploader: { fullName: string | null; email: string | null } | null;
};

const actionButton = "inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50";
const domainLabel = (value: string) => DOMAINS.find((d) => d.value === value)?.label ?? value;
const when = (iso: string | null) => (iso ? whenOf(iso) : "—");
const whenOf = (iso: string) => new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });

/** Real upload history from GET /api/upload-batches, scoped by the backend to the user's dapur. */
export async function UploadHistory({ canOpen }: { canOpen: boolean }) {
  const { data } = await apiGet<{ data: Batch[] }>("/upload-batches?pageSize=20");

  return (
    <section>
      <h2 className="text-lg font-semibold text-slate-900">Upload History</h2>
      <Card className="mt-4 overflow-x-auto">
        <table className="w-full min-w-5xl text-left">
          <thead className="border-b border-slate-200 bg-slate-50 text-sm text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">File</th>
              <th className="px-4 py-3 font-medium">Dapur</th>
              <th className="px-4 py-3 font-medium">Jenis data</th>
              <th className="px-4 py-3 font-medium">Diunggah oleh</th>
              <th className="px-4 py-3 font-medium">Waktu</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Profil mapping</th>
              <th className="px-4 py-3 font-medium">Divalidasi</th>
              <th className="px-4 py-3 font-medium">Dipublish</th>
              <th className="px-4 py-3 font-medium"><span className="sr-only">Aksi</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {data.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-center text-slate-500">
                  Belum ada unggahan.
                </td>
              </tr>
            )}
            {data.map((b) => (
              <tr key={b.publicId} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <FileText className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden="true" />
                    <p className="font-semibold text-slate-800">{b.fileName}</p>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-700">{b.kitchen.code ?? b.kitchen.name}</td>
                <td className="px-4 py-3 text-slate-700">{domainLabel(b.domain)}</td>
                <td className="px-4 py-3 text-slate-700">{b.uploader?.fullName ?? b.uploader?.email ?? "—"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-500">{when(b.uploadDate)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={b.status} errorCode={b.errorCode} />
                </td>
                <td className="px-4 py-3 text-slate-700">{b.mappingProfileId ?? "—"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-500">{when(b.validatedAt)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-500">{when(b.publishedAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {canOpen && b.status !== "FAILED" && b.status !== "SUPERSEDED" && (
                      <Link href={`/mapping-validasi?batch=${b.publicId}`} aria-label={`Buka ${b.fileName}`} className={actionButton}>
                        Buka
                      </Link>
                    )}
                    {b.storageKey && (
                      <a href={`/unggah-data/batch/${b.id}/file`} aria-label={`Export ${b.fileName}`} className={actionButton}>
                        <Download className="size-4" aria-hidden="true" />
                        Export
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </section>
  );
}
