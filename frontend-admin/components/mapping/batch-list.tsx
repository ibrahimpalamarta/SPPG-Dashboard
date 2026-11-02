import { Download, FileText } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { MorphSelect } from "@/components/ui/morph-select";
import { Pager } from "@/components/ui/pager";
import { DeleteAllBatchesButton, DeleteBatchButton } from "@/components/mapping/delete-batch-button";
import { apiGet } from "@/lib/api";
import { DOMAINS, STATUS, StatusBadge } from "@/lib/upload";
import type { Kitchen } from "@/lib/me";
import type { Batch } from "@/lib/mapping-validasi";

const PAGE_SIZE = 20;

const actionButton = "inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 px-2 text-xs font-medium text-slate-700 hover:bg-slate-50";
const domainLabel = (value: string) => DOMAINS.find((d) => d.value === value)?.label ?? value;
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "—");

const uploader = (b: Batch) => b.uploader?.fullName ?? b.uploader?.email ?? "—";
const initials = (name: string) => name.split(/[\s@]+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
// Picked deterministically from the name so one uploader always keeps the same color.
const AVATAR_TONES = ["bg-blue-600", "bg-violet-600"];
const avatarTone = (name: string) => AVATAR_TONES[name.charCodeAt(0) % AVATAR_TONES.length];

type BatchFilters = { kitchenId?: string; domain?: string; status?: string };

// The backend refuses forced deletes in production too; this only hides the switch.
const DEV_TOOLS = process.env.NODE_ENV !== "production";

/**
 * The file list. By default it is Upload History (SCRUM-137/148): every attempt, filterable, where a file is opened
 * to be checked and published. `compact` is the history shown under the upload form: Export instead of Open,
 * no filters, and its pages stay on Unggah Data. Development mode (`dev`, a switch in the header) adds Hapus per row
 * and Hapus semua file, which also remove PUBLISHED batches so testing can restart from an empty Overview.
 */
export async function BatchList({ page, canDelete, dev = false, compact = false, filters = {}, kitchens = [] }: { page: number; canDelete: boolean; dev?: boolean; compact?: boolean; filters?: BatchFilters; kitchens?: Kitchen[] }) {
  const base = compact ? "/unggah-data" : "/mapping-validasi";
  const showDev = canDelete && DEV_TOOLS;
  const devOn = showDev && dev && !compact;
  const query = new URLSearchParams(Object.entries(filters).filter(([, v]) => v) as [string, string][]);
  const devQuery = new URLSearchParams(query);
  if (!devOn) devQuery.set("dev", "1");
  // The compact history on Unggah Data only points to the switch on Upload History.
  const devToggle = showDev && (
    <Link href={compact ? "/mapping-validasi" : `${base}?${devQuery}`} role="switch" aria-checked={devOn} className="flex items-center gap-2 text-sm text-slate-600">
      Mode development
      <span className={`flex h-5 w-9 items-center rounded-full px-0.5 transition-colors ${devOn ? "bg-red-500" : "bg-slate-300"}`}>
        <span className={`size-4 rounded-full bg-white transition-transform ${devOn ? "translate-x-4" : ""}`} />
      </span>
    </Link>
  );
  const { data, meta } = await apiGet<{ data: Batch[]; meta: { page: number; totalPages: number } }>(
    `/upload-batches?${new URLSearchParams({ pageSize: String(PAGE_SIZE), page: String(page), ...Object.fromEntries(query) })}`,
  );

  return (
    <div className="mx-auto max-w-400 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        {compact ? (
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Upload History</h2>
        ) : (
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Upload History</h1>
            <p className="mt-1 text-slate-500">Semua file yang pernah diunggah.</p>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-4">
          {devOn && data.length > 0 && <DeleteAllBatchesButton />}
          {devToggle}
        </div>
      </div>
      {!compact && (
        <form className="flex flex-wrap items-center gap-2" action={base}>
          {devOn && <input type="hidden" name="dev" value="1" />}
          {kitchens.length > 1 && (
            <MorphSelect
              name="kitchenId"
              label="Dapur"
              defaultValue={filters.kitchenId}
              options={[{ value: "", label: "Semua dapur" }, ...kitchens.map((k) => ({ value: k.id, label: k.code ?? k.name }))]}
            />
          )}
          <MorphSelect name="domain" label="Jenis data" defaultValue={filters.domain} options={[{ value: "", label: "Semua jenis data" }, ...DOMAINS]} />
          <MorphSelect
            name="status"
            label="Status"
            defaultValue={filters.status}
            options={[{ value: "", label: "Semua status" }, ...Object.entries(STATUS).map(([value, s]) => ({ value, label: s.label }))]}
          />
          <button className={actionButton}>Terapkan</button>
        </form>
      )}
      <Card className="overflow-x-auto">
        <table className="w-full min-w-3xl text-left">
          <thead className="border-b border-slate-200 bg-slate-50 text-sm text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">File</th>
              <th className="px-4 py-3 font-medium">Dapur</th>
              <th className="px-4 py-3 font-medium">Jenis data</th>
              <th className="px-4 py-3 font-medium">Diunggah</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"><span className="sr-only">Aksi</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {data.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  Belum ada file yang diunggah.
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
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${avatarTone(uploader(b))}`} aria-hidden="true">
                      {initials(uploader(b))}
                    </span>
                    <div className="whitespace-nowrap">
                      <p className="text-slate-800">{uploader(b)}</p>
                      <p className="text-slate-500">{when(b.uploadDate)}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={b.status} errorCode={b.errorCode} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {!compact && b.status !== "FAILED" && (
                      <Link href={`/mapping-validasi?batch=${b.publicId}`} aria-label={`Buka ${b.fileName}`} className={actionButton}>
                        Buka
                      </Link>
                    )}
                    {compact && b.storageKey && (
                      <a href={`/unggah-data/batch/${b.id}/file`} aria-label={`Export ${b.fileName}`} className={actionButton}>
                        <Download className="size-3.5" aria-hidden="true" />
                        Export
                      </a>
                    )}
                    {devOn && <DeleteBatchButton id={b.id} fileName={b.fileName} />}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Pager page={meta.page} totalPages={meta.totalPages} hrefFor={(p) => `${base}?${new URLSearchParams({ ...Object.fromEntries(query), ...(devOn && { dev: "1" }), listPage: String(p) })}`} />
    </div>
  );
}
