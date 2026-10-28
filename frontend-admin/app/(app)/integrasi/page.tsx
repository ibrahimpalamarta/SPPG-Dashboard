import { Plug } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { requirePage } from "@/lib/guard";

export const metadata: Metadata = { title: "Integrasi · SPPG Internal" };

const STATUS = {
  none: { label: "Tidak tersedia", className: "bg-slate-100 text-slate-600" },
  manual: { label: "Manual export", className: "bg-slate-100 text-slate-600" },
  upload: { label: "Upload aktif", className: "bg-emerald-50 text-emerald-700" },
} as const;

const INTEGRATIONS = [
  { name: "SIPGN – MPM", status: "none", scope: "Saldo VA, beneficiary, organoleptik, komplain", note: "Portal BGN belum dapat diakses" },
  { name: "SIPGN – POP", status: "none", scope: "Produksi per batch, distribusi", note: "Portal BGN belum dapat diakses" },
  { name: "SIPGN – Aksis", status: "manual", scope: "Pengeluaran, saldo & banper (Lawang)", note: "Export manual oleh Accountant" },
  { name: "EFI Input Maker", status: "upload", scope: "Payment request & approval", note: "Export / controlled upload (MAP-SKN-PAY-001)" },
  { name: "Google Sheets / Excel", status: "upload", scope: "Cashflow, Menu, RAB, PO", note: "Upload file (Phase 1 primary flow)" },
  { name: "GForm Update Data Harian", status: "manual", scope: "Status operasional harian", note: "Respons milik pihak luar · perlu salinan internal" },
] as const satisfies readonly { name: string; status: keyof typeof STATUS; scope: string; note: string }[];

export default async function IntegrasiPage() {
  await requirePage("/integrasi");
  return (
    <div className="mx-auto max-w-400">
      <Card className="space-y-6 p-6 sm:p-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Integrasi</h1>
          <p className="mt-2 max-w-xl text-slate-600">Phase 1 membaca upload/export. Integrasi API/write-back dua arah ke SIPGN/POP/Aksis/MPM di luar lingkup (OS1, OD-08).</p>
        </div>

        <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {INTEGRATIONS.map(({ name, status, scope, note }) => (
            <li key={name} className="space-y-3 rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 font-semibold text-slate-900">
                  <Plug className="size-4 shrink-0 text-slate-500" aria-hidden="true" />
                  {name}
                </h2>
                <span className={`shrink-0 rounded-md px-2 py-1 text-xs font-semibold ${STATUS[status].className}`}>{STATUS[status].label}</span>
              </div>
              <p className="text-sm text-slate-700">{scope}</p>
              <p className="text-xs text-slate-500">{note}</p>
              {status === "upload" ? (
                <Link href="/unggah-data" className="inline-flex h-9 items-center rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-800 hover:border-emerald-300">Unggah file</Link>
              ) : (
                <span className="inline-flex h-9 items-center rounded-md border border-slate-100 bg-slate-50 px-3 text-sm font-medium text-slate-400">API · setelah OD-08</span>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
