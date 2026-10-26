import { ChevronRight, FileText } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { StatusBadge, DOMAINS } from "@/lib/upload";
import { apiGet } from "@/lib/api";

type Batch = {
  publicId: string;
  fileName: string;
  domain: string;
  status: string;
  errorCode: string | null;
  uploadDate: string;
  kitchen: { code: string | null; name: string };
  uploader: { fullName: string | null; email: string | null } | null;
};

const domainLabel = (value: string) => DOMAINS.find((d) => d.value === value)?.label ?? value;
const when = (iso: string) => new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });

/** Real upload history from GET /api/upload-batches, scoped by the backend to the user's dapur. */
export async function UploadHistory({ canOpen }: { canOpen: boolean }) {
  const { data } = await apiGet<{ data: Batch[] }>("/upload-batches?pageSize=20");

  return (
    <section>
      <h2 className="text-lg font-semibold text-slate-900">Upload History</h2>
      <Card className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[48rem] text-left">
          <thead className="border-b border-slate-200 bg-slate-50 text-sm text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">File</th>
              <th className="px-4 py-3 font-medium">Dapur</th>
              <th className="px-4 py-3 font-medium">Jenis data</th>
              <th className="px-4 py-3 font-medium">Diunggah oleh</th>
              <th className="px-4 py-3 font-medium">Waktu</th>
              <th className="px-4 py-3 font-medium">Status</th>
              {canOpen && <th className="px-4 py-3 font-medium"><span className="sr-only">Aksi</span></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {data.length === 0 && (
              <tr>
                <td colSpan={canOpen ? 7 : 6}className="px-4 py-6 text-center text-slate-500">
                  Belum ada unggahan.
                </td>
              </tr>
            )}
            {data.map((b) => (
              <tr key={b.publicId}>
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
                {canOpen && (
                  <td className="px-4 py-3 text-right">
                    {b.status !== "FAILED" && (
                      <Link href={`/mapping-validasi?batch=${b.publicId}`} aria-label={`Buka ${b.fileName}`} className="inline-flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-emerald-700">
                        <ChevronRight className="size-4" aria-hidden="true" />
                      </Link>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </section>
  );
}
