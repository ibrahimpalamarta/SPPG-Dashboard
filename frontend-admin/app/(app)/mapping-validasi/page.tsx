import { Send } from "lucide-react";
import type { Metadata } from "next";
import { ColumnTable } from "@/components/mapping/column-table";
import { FileSelect } from "@/components/mapping/file-select";
import { FindingsPanel } from "@/components/mapping/findings-panel";
import { HistoryList, type HistoryEntry } from "@/components/mapping/history-list";
import { RecordsTable, type Txn } from "@/components/mapping/records-table";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { apiGet } from "@/lib/api";
import { requirePage } from "@/lib/guard";
import { batchFindings, tabs, type Batch, type BatchDetail } from "@/lib/mapping-validasi";
import { DOMAINS, StatusBadge } from "@/lib/upload";

export const metadata: Metadata = { title: "Validasi Data · SPPG Internal" };

const domainLabel = (value: string) => DOMAINS.find((d) => d.value === value)?.label ?? value;

export default async function Page({ searchParams }: { searchParams: Promise<{ batch?: string }> }) {
  const [me, params] = await Promise.all([requirePage("/mapping-validasi"), searchParams]);
  if (!me.permissions.includes("upload:view")) {
    return (
      <EmptyState title="Tidak ada akses">
        <p>Peran Anda belum dapat melihat file yang diunggah.</p>
      </EmptyState>
    );
  }

  const { data } = await apiGet<{ data: Batch[] }>("/upload-batches?pageSize=50");
  // FAILED never held usable data (incl. empty and replaced files), so there is nothing to map or validate.
  const batches = data.filter((b) => b.status !== "FAILED");
  const batch = batches.find((b) => b.publicId === params.batch) ?? batches[0];
  if (!batch) {
    return (
      <EmptyState title="Belum ada file untuk dicek">
        <p>Unggah file di menu Unggah Data. File yang gagal diproses tidak muncul di sini.</p>
      </EmptyState>
    );
  }

  // ponytail: first 100 transactions only; add paging to "Hasil data" when a file needs more on screen.
  const [detail, records, history] = await Promise.all([
    apiGet<BatchDetail>(`/upload-batches/${batch.id}`),
    apiGet<{ data: Txn[]; meta: { total: number } }>(`/upload-batches/${batch.id}/records?pageSize=100`),
    apiGet<HistoryEntry[]>(`/upload-batches/${batch.id}/history`),
  ]);
  const findings = batchFindings(detail);
  const label = (b: Batch) => `${b.fileName} · ${b.kitchen.code ?? b.kitchen.name} · ${domainLabel(b.domain)} · ${b.rowCount} baris`;
  return (
    <div className="mx-auto max-w-400">
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Validasi Data</h1>
            <FileSelect value={batch.publicId} options={batches.map((b) => ({ id: b.publicId, label: label(b) }))} />
            <StatusBadge status={batch.status} errorCode={batch.errorCode} />
          </div>
          <button
            disabled={batch.status !== "READY"}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
          >
            <Send className="size-4" aria-hidden="true" />
            Kirim ke PM
          </button>
        </div>
        <FindingsPanel
          key={batch.publicId}
          findings={findings}
          panels={{
            [tabs[1]]: <ColumnTable result={detail.mappingResult} />,
            [tabs[3]]: <RecordsTable txns={records.data} total={records.meta.total} totals={detail.mappingResult?.mapping?.totals ?? {}} />,
            [tabs[4]]: <HistoryList entries={history} />,
          }}
        />
      </Card>
    </div>
  );
}
