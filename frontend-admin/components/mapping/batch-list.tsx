import { Download, FileText } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Pager } from "@/components/ui/pager";
import { DeleteBatchButton } from "@/components/mapping/delete-batch-button";
import { apiGet } from "@/lib/api";
import { DOMAINS, STATUS, StatusBadge } from "@/lib/upload";
import type { Kitchen } from "@/lib/me";
import type { Batch } from "@/lib/mapping-validasi";

const PAGE_SIZE = 20;

const actionButton = "inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50";
const domainLabel = (value: string) => DOMAINS.find((d) => d.value === value)?.label ?? value;
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "—");

type BatchFilters = { kitchenId?: string; domain?: string; status?: string };

const select = "h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700";

/**
 * The file list. `history` is Upload History (SCRUM-137/148): every attempt, view and Export only, filterable.
 * Otherwise it is the Validasi Data landing list, where a file is opened to be checked and published.
 */
export async function BatchList({ page, canDelete, history = false, filters = {}, kitchens = [] }: { page: number; canDelete: boolean; history?: boolean; filters?: BatchFilters; kitchens?: Kitchen[] }) {
  const base = history ? "/upload-history" : "/mapping-validasi";
  const query = new URLSearchParams(Object.entries(filters).filter(([, v]) => v) as [string, string][]);
  const { data, meta } = await apiGet<{ data: Batch[]; meta: { page: number; totalPages: number } }>(
    `/upload-batches?${new URLSearchParams({ pageSize: String(PAGE_SIZE), page: String(page), ...Object.fromEntries(query) })}`,
  );
  // FAILED never held usable data (incl. empty and replaced files), so there is nothing to validate; history still lists it.
  const batches = history ? data : data.filter((b) => b.status !== "FAILED");

  return (
    <div className="mx-auto max-w-400 space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{history ? "Upload History" : "Validasi Data"}</h1>
        <p className="mt-1 text-slate-500">{history ? "Semua file yang pernah diunggah." : "Pilih file untuk dicek dan dipublish."}</p>
      </div>
      {history && (
        <form className="flex flex-wrap items-center gap-2" action={base}>
          {kitchens.length > 1 && (
            <select name="kitchenId" defaultValue={filters.kitchenId ?? ""} aria-label="Dapur" className={select}>
              <option value="">Semua dapur</option>
              {kitchens.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.code ?? k.name}
                </option>
              ))}
            </select>
          )}
          <select name="domain" defaultValue={filters.domain ?? ""} aria-label="Jenis data" className={select}>
            <option value="">Semua jenis data</option>
            {DOMAINS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
          <select name="status" defaultValue={filters.status ?? ""} aria-label="Status" className={select}>
            <option value="">Semua status</option>
            {Object.entries(STATUS).map(([value, s]) => (
              <option key={value} value={value}>
                {s.label}
              </option>
            ))}
          </select>
          <button className={actionButton}>Terapkan</button>
        </form>
      )}
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
            {batches.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-6 text-center text-slate-500">
                  {history ? "Belum ada file yang diunggah." : "Belum ada file untuk dicek. Unggah file di menu Unggah Data."}
                </td>
              </tr>
            )}
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
                    {!history && (
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
                    {canDelete && <DeleteBatchButton id={b.id} fileName={b.fileName} />}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Pager page={meta.page} totalPages={meta.totalPages} hrefFor={(p) => `${base}?${new URLSearchParams({ ...Object.fromEntries(query), listPage: String(p) })}`} />
    </div>
  );
}
