"use client";

import { ArrowLeft, ArrowRight, BookOpen, Coins, FileText, Package, UserRound, Utensils, Wallet, WalletCards, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { uploadFile, type UploadResult } from "./actions";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/lib/upload";
import type { Kitchen } from "@/lib/me";

const field = "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20";
const primaryButton = "inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60";
const choice = (selected: boolean) =>
  `rounded-xl border p-4 text-left disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-40 ${selected ? "border-emerald-600 ring-1 ring-emerald-600" : "border-slate-200 enabled:hover:border-emerald-300"}`;

// Domains with an official empty template (SCRUM-125); the rest upload an ordinary file.
const TEMPLATES: Record<string, string> = { CASHFLOW: "cashflow", MENU: "menu" };

// `value` mirrors backend UploadDomain; no value = no backend support yet (Manual Entry / not ingested).
const DOMAIN_CARDS: { value?: string; label: string; note: string; icon: LucideIcon }[] = [
  { value: "CASHFLOW", label: "Cashflow", note: "Catatan uang masuk & keluar", icon: Wallet },
  { value: "RAB", label: "RAB", note: "Rencana anggaran per periode", icon: Utensils },
  { value: "PO", label: "Purchase Order", note: "Daftar pesanan ke supplier", icon: FileText },
  { value: "INPUT_MAKER", label: "Input Maker", note: "Permintaan bayar ke supplier (tanpa data rekening)", icon: Coins },
  { value: "VENDOR_PAYMENT", label: "Pembayaran Supplier", note: "Bukti bayar ke supplier (Input Maker / EFI)", icon: Coins },
  { value: "MENU", label: "Master Menu", note: "Menu & gizi yang direncanakan", icon: BookOpen },
  { value: "GOODS_RECEIPT", label: "Penerimaan Barang", note: "Barang yang diterima dapur", icon: Package },
  { label: "Saldo Rekening", note: "Belum bisa diunggah. Laporan saldo harian (VA / LapKeu).", icon: WalletCards },
  { label: "Jumlah Penerima Manfaat", note: "Belum ada file. Isi lewat Manual Entry.", icon: UserRound },
];

const STEPS = ["Pilih Kitchen, jenis data & periode", "Pilih file", "Deteksi & validasi"];

const formatSize = (bytes: number) => (bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

export function UploadForm({ kitchens, kitchenId }: { kitchens: Kitchen[]; kitchenId?: string }) {
  const [result, action, pending] = useActionState<UploadResult | null, FormData>(uploadFile, null);
  const [step, setStep] = useState(1);
  const [kitchen, setKitchen] = useState(kitchenId ?? kitchens[0].id);
  const [domain, setDomain] = useState("CASHFLOW");
  const [file, setFile] = useState<File | null>(null);
  // "Unggah ulang" goes back to the file step without dropping kitchen/domain.
  const [retry, setRetry] = useState(false);
  const current = result?.ok && !retry ? 3 : step;

  return (
    // Not `action={action}`: React resets the form after an action, which empties the file input
    // while `file` still shows its name, so a failed upload would need the file picked again.
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setRetry(false);
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      className="space-y-5"
    >
      <input type="hidden" name="kitchenId" value={kitchen} />
      <input type="hidden" name="domain" value={domain} />
      {/* SCRUM-124: re-uploading a quarantined file closes it as "Diganti". */}
      {retry && result?.ok && result.status === "NEEDS_MAPPING_UPDATE" && <input type="hidden" name="replaces" value={result.batchId} />}

      <Card className="space-y-6 p-6">
        <ol className="flex items-center gap-4 text-sm">
          {STEPS.map((label, i) => (
            <li key={label} className={`flex items-center gap-3 ${i > 0 ? "flex-1" : ""}`}>
              {i > 0 && <span className="hidden h-px flex-1 bg-slate-200 sm:block" aria-hidden="true" />}
              <span className={`grid size-8 shrink-0 place-items-center rounded-full border text-sm font-semibold ${current >= i + 1 ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 text-slate-500"}`}>{i + 1}</span>
              <span className={`hidden whitespace-nowrap font-semibold sm:inline ${current >= i + 1 ? "text-slate-900" : "text-slate-500"}`}>{label}</span>
            </li>
          ))}
        </ol>

        <div hidden={current !== 1} className="space-y-6">
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-slate-800">1. Pilih kitchen</legend>
            <select value={kitchen} onChange={(e) => setKitchen(e.target.value)} className={`${field} max-w-md`}>
              {kitchens.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.code ? `${k.code} · ${k.name}` : k.name}
                </option>
              ))}
            </select>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-slate-800">2. Pilih jenis data</legend>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {DOMAIN_CARDS.map(({ value, label, note, icon: Icon }) => (
                <button key={label} type="button" disabled={!value} aria-pressed={value === domain} onClick={() => value && setDomain(value)} className={choice(value === domain)}>
                  <span className="flex items-center gap-2 font-semibold">
                    <Icon className="size-4 shrink-0 text-slate-500" aria-hidden="true" />
                    {label}
                  </span>
                  <span className="mt-2 block text-sm text-slate-500">{note}</span>
                </button>
              ))}
            </div>
          </fieldset>
          {TEMPLATES[domain] && (
            <a href={`unggah-data/template/${TEMPLATES[domain]}`} download className="inline-block text-sm font-medium text-emerald-700 underline">
              Unduh template kosong resmi
            </a>
          )}

          <label className="block space-y-2 text-sm">
            <span className="font-semibold text-slate-800">
              3. Periode <span className="font-normal text-slate-500">(opsional)</span>
            </span>
            <input type="month" name="period" className={`${field} max-w-xs`} />
            <span className="block text-slate-500">Boleh dikosongkan. Sistem akan mengisi dari file.</span>
          </label>

          <div className="flex justify-end">
            <button type="button" onClick={() => setStep(2)} className={primaryButton}>
              Lanjut pilih file
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div hidden={current !== 2} className="space-y-4">
          <label className="block space-y-1 text-sm">
            <span className="font-semibold text-slate-800">File (.xlsx atau .csv, maks. 10 MB)</span>
            <input type="file" name="file" accept=".xlsx,.csv" required onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium" />
          </label>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-slate-500">File dipilih</dt>
            <dd className="text-slate-800">{file ? `${file.name} (${formatSize(file.size)})` : "—"}</dd>
          </dl>
          {result && !result.ok && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {result.message}
            </p>
          )}
          <div className="flex justify-between">
            <button type="button" onClick={() => setStep(1)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:border-emerald-300">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Kembali
            </button>
            <button type="submit" disabled={pending} className={primaryButton}>
              {pending ? "Mengunggah…" : "Unggah"}
            </button>
          </div>
        </div>

        {result?.ok && current === 3 && (
          <section aria-live="polite" className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={result.status} errorCode={result.errorCode} />
              <span className="font-mono text-xs text-slate-500">Batch {result.batchId}</span>
              <span className="text-slate-600">{result.rowCount} baris</span>
            </div>
            {result.warning && <p className="rounded-md bg-amber-50 p-3 text-amber-800">{result.warning}</p>}
            {result.errorSummary && <p className="text-slate-700">{result.errorSummary}</p>}
            <p className="text-slate-600">
              Profil terdeteksi: <span className="font-medium text-slate-800">{result.mapping ? `${result.mapping.profileId} v${result.mapping.version}` : "Belum terdeteksi"}</span>
            </p>
            {result.mapping && (
              <p className="text-slate-600">
                {result.mapping.records} record dipetakan
                {Object.keys(result.mapping.issueCounts).length > 0 &&
                  ` · perlu dicek: ${Object.entries(result.mapping.issueCounts)
                    .map(([code, n]) => `${n} ${code}`)
                    .join(", ")}`}
              </p>
            )}
            {result.columnDiff.some((d) => d.missing.length || d.unexpected.length) && (
              <table className="w-full max-w-2xl text-left">
                <caption className="mb-2 text-left font-semibold text-slate-800">Perbedaan kolom dengan format yang dikenal</caption>
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Sheet</th>
                    <th className="py-2 pr-4 font-medium">Kolom tidak ditemukan</th>
                    <th className="py-2 font-medium">Kolom tidak dikenal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.columnDiff.map((d) => (
                    <tr key={d.sheet}>
                      <td className="py-2 pr-4 font-medium text-slate-800">{d.sheet}</td>
                      <td className="py-2 pr-4 text-red-700">{d.missing.join(", ") || "—"}</td>
                      <td className="py-2 text-slate-600">{d.unexpected.join(", ") || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {result.sheets.length > 0 && (
              <ul className="list-inside list-disc text-slate-600">
                {result.sheets.map((s) => (
                  <li key={s.name}>
                    Sheet <span className="font-medium">{s.name}</span>: {s.headerRow ? `header baris ${s.headerRow}, ${s.rowCount} baris data` : "header tidak ditemukan"}
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap items-center gap-4">
              {result.status !== "NEEDS_REVIEW" && (
                <button type="button" onClick={() => { setRetry(true); setStep(2); }} className={primaryButton}>
                  Unggah Ulang File
                </button>
              )}
              <Link href="/mapping-validasi" className="inline-block font-medium text-emerald-700 hover:underline">
                Ke Validasi Data
              </Link>
            </div>
          </section>
        )}
      </Card>
    </form>
  );
}
