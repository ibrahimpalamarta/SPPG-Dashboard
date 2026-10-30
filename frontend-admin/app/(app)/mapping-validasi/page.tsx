import { ArrowLeft, Send } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { BatchList } from "@/components/mapping/batch-list";
import { ColumnTable } from "@/components/mapping/column-table";
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

const RECORDS_PAGE_SIZE = 20;

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ batch?: string; listPage?: string; recordsPage?: string }>;
}) {
  const [me, params] = await Promise.all([requirePage("/mapping-validasi"), searchParams]);
  if (!me.permissions.includes("upload:view")) {
    return (
      <EmptyState title="Tidak ada akses">
        <p>Peran Anda belum dapat melihat file yang diunggah.</p>
      </EmptyState>
    );
  }

  if (!params.batch) {
    return <BatchList page={Number(params.listPage) || 1} canDelete={me.permissions.includes("batch:review")} />;
  }

  const recordsPage = Number(params.recordsPage) || 1;
  const { data } = await apiGet<{ data: Batch[] }>("/upload-batches?pageSize=50");
  // FAILED never held usable data (incl. empty and replaced files), so there is nothing to map or validate.
  const batch = data.find((b) => b.publicId === params.batch && b.status !== "FAILED");
  if (!batch) {
    return (
      <EmptyState title="File tidak ditemukan">
        <p>
          File ini tidak ada atau gagal diproses.{" "}
          <Link href="/mapping-validasi" className="font-medium text-emerald-700 underline">
            Kembali ke daftar file
          </Link>
          .
        </p>
      </EmptyState>
    );
  }

  const [detail, records, history] = await Promise.all([
    apiGet<BatchDetail>(`/upload-batches/${batch.id}`),
    apiGet<{ data: Txn[]; meta: { page: number; totalPages: number; total: number } }>(
      `/upload-batches/${batch.id}/records?pageSize=${RECORDS_PAGE_SIZE}&page=${recordsPage}`,
    ),
    apiGet<HistoryEntry[]>(`/upload-batches/${batch.id}/history`),
  ]);
  const findings = batchFindings(detail);
  return (
    <div className="mx-auto max-w-400 space-y-4">
      <Link href="/mapping-validasi" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Daftar file
      </Link>
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{batch.fileName}</h1>
            <span className="text-slate-500">
              {batch.kitchen.code ?? batch.kitchen.name} · {domainLabel(batch.domain)} · {batch.rowCount} baris
            </span>
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
          batchId={batch.publicId}
          canResolve={batch.status === "NEEDS_REVIEW" && me.permissions.includes("upload:create")}
          panels={{
            [tabs[1]]: <ColumnTable result={detail.mappingResult} />,
            [tabs[3]]: (
              <RecordsTable
                txns={records.data}
                total={records.meta.total}
                totals={detail.mappingResult?.mapping?.totals ?? {}}
                page={records.meta.page}
                totalPages={records.meta.totalPages}
                hrefFor={(p) => `/mapping-validasi?batch=${batch.publicId}&recordsPage=${p}`}
              />
            ),
            [tabs[4]]: <HistoryList entries={history} />,
          }}
        />
      </Card>
    </div>
  );
}
