"use client";

import { BookOpen, Coins, FileText, Link2, PackageCheck, TriangleAlert, Utensils, Wallet, Check, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useLang, useT } from "@/components/i18n-provider";
import { Modal } from "@/components/ui/modal";
import { kpiSources } from "@/app/(app)/overview/actions";
import { dateLocale } from "@/lib/lang";
import type { KpiSource } from "@/lib/kpi";
import { STATUS } from "@/lib/upload";

/** Which Overview card to trace; `title`/`headline` are the blue box of the modal. Without it the link is not wired yet. */
export type Trace = { kpi: Parameters<typeof kpiSources>[0]; query: string; title: string; headline: string };

const DOMAIN_ICON: Record<string, LucideIcon> = {
  CASHFLOW: Wallet,
  MENU: BookOpen,
  RAB: Utensils,
  PO: FileText,
  INPUT_MAKER: Coins,
  VENDOR_PAYMENT: Coins,
  GOODS_RECEIPT: PackageCheck,
};

export function SourceLink({ className = "text-emerald-700", trace }: { className?: string; trace?: Trace }) {
  const t = useT();
  const locale = dateLocale(useLang());
  const [open, setOpen] = useState(false);
  const [sources, setSources] = useState<KpiSource[] | null | undefined>();

  const show = () => {
    if (!trace) return;
    setOpen(true);
    setSources(undefined);
    kpiSources(trace.kpi, trace.query).then(setSources);
  };
  const when = (iso: string) => {
    const d = new Date(iso);
    const tz = "Asia/Jakarta";
    return `${d.toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric", timeZone: tz })} ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: tz })}`;
  };

  return (
    <>
      <button type="button" onClick={show} className={`flex items-center gap-2 text-sm font-medium ${className}`}>
        <Link2 className="size-4" aria-hidden="true" />
        {t("Lacak Sumber")}
      </button>
      {trace && (
        <Modal
          open={open}
          onClose={() => setOpen(false)}
          icon={<Link2 className="size-5 text-sky-600" />}
          title={t("Lacak Sumber")}
          subtitle={t("Dari mana angka ini berasal.")}
          footer={
            <>
              <Link href="/unggah-data" className="rounded-lg border border-sky-300 px-4 py-2 text-sm font-medium text-sky-700 hover:bg-sky-50">
                {t("Lihat Data Upload")}
              </Link>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200">
                {t("Selesai")}
              </button>
            </>
          }
        >
          <div className="max-h-[60vh] space-y-3 overflow-y-auto">
            <div className="rounded-xl bg-sky-50 p-4">
              <p className="text-sm text-slate-500">{trace.title}</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{trace.headline}</p>
            </div>
            <h3 className="pt-1 text-sm font-semibold text-slate-600">{sources ? t("Sumber data ({count} file)", { count: sources.length }) : t("Sumber data")}</h3>
            {sources === undefined && <p>{t("Memuat…")}</p>}
            {sources === null && <p>{t("Gagal memuat sumber data.")}</p>}
            {sources?.length === 0 && <p>{t("Belum ada file sumber.")}</p>}
            {sources?.map((s) => {
              const Icon = DOMAIN_ICON[s.domain] ?? FileText;
              const published = s.status === "PUBLISHED";
              return (
                <div key={s.code} className="flex gap-3 rounded-xl border border-slate-200 p-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600" aria-hidden="true">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="break-words font-medium text-slate-900">{s.fileName}</p>
                      <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium ${published ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                        {published ? <Check className="size-3" aria-hidden="true" /> : <TriangleAlert className="size-3" aria-hidden="true" />}
                        {published ? t("Sudah dipublish") : t("Draft")}
                      </span>
                    </div>
                    <p className="font-mono text-xs text-slate-400">{s.code}</p>
                    <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                      <dt className="text-slate-400">{t("Diunggah")}</dt>
                      <dd className="text-slate-800">{when(s.uploadedAt)}</dd>
                      <dt className="text-slate-400">{t("Oleh")}</dt>
                      <dd className="text-slate-800">{s.uploadedBy ?? "-"}</dd>
                      {!published && (
                        <>
                          <dt className="text-slate-400">{t("Status")}</dt>
                          <dd className="text-slate-800">{t(STATUS[s.status].label)}</dd>
                        </>
                      )}
                    </dl>
                  </div>
                </div>
              );
            })}
          </div>
        </Modal>
      )}
    </>
  );
}
