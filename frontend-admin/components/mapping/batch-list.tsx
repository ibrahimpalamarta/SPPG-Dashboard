import { Download, FileText } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pager } from "@/components/ui/pager";
import { apiGet } from "@/lib/api";
import { DOMAINS, StatusBadge } from "@/lib/upload";
import type { Batch } from "@/lib/mapping-validasi";

const PAGE_SIZE = 20;

const actionButton = "inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50";
const domainLabel = (value: string) => DOMAINS.find((d) => d.value === value)?.label ?? value;
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "—");

/** Landing list for Validasi Data — also doubles as the upload history (file, dapur, waktu, status, export). */
export async function BatchList({ page }: { page: number }) {
  const { data, meta } = await apiGet<{ data: Batch[]; meta: { page: number; totalPages: number } }>(
    `/upload-batches?pageSize=${PAGE_SIZE}&page=${page}`,
  );
  // FAILED never held usable data (incl. empty and replaced files), so there is nothing to map or validate.
  const batches = data.filter((b) => b.status !== "FAILED");

  if (batches.length === 0) {
    return (
      <EmptyState title="Belum ada file untuk dicek">
        <p>Unggah file di menu Unggah Data. File yang gagal diproses tidak muncul di sini.</p>
      </EmptyState>
    );
  }

  return (
    <div className="mx-auto max-w-400 space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Validasi Data</h1>
        <p className="mt-1 text-slate-500">Pilih file untuk dicek dan dimapping.</p>
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-5xl text-left">
          <thead className="border-b border-slate-200 bg-slate-50 text-sm text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">File</th>
              <th className="px-4 py-3 font-medium">Dapur</th>
              <th className="px-4 py-3 font-medium">Jenis data</th>
              <th className="px-4 py-3 font-medium">Baris</th>
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
            {batches.map((b) => (
              <tr key={b.publicId} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <FileText className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden="true" />
                    <p className="font-semibold text-slate-800">{b.fileName}</p>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-700">{b.kitchen.code ?? b.kitchen.name}</td>
                <td className="px-4 py-3 text-slate-700">{domainLabel(b.domain)}</td>
                <td className="px-4 py-3 text-slate-700">{b.rowCount}</td>
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
                    <Link href={`/mapping-validasi?batch=${b.publicId}`} aria-label={`Buka ${b.fileName}`} className={actionButton}>
                      Buka
                    </Link>
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
      <Pager page={meta.page} totalPages={meta.totalPages} hrefFor={(p) => `/mapping-validasi?listPage=${p}`} />
    </div>
  );
}
