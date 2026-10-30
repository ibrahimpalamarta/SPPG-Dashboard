"use client";

import { BookOpen, Coins, FileText, Package, Utensils, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { startTransition, useActionState, useRef, useState, useTransition } from "react";
import { checkFile, uploadFile, type CheckResult, type UploadResult } from "./actions";
import { Card } from "@/components/ui/card";
import type { Kitchen } from "@/lib/me";

const field = "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20";
const primaryButton = "inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60";
const secondaryButton = "inline-flex h-10 items-center gap-2 rounded-lg border border-emerald-700 px-4 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-60";
const choice = (selected: boolean) =>
  `rounded-xl border p-4 text-left disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-40 ${selected ? "border-emerald-600 ring-1 ring-emerald-600" : "border-slate-200 enabled:hover:border-emerald-300"}`;

// Domains with an official empty template (SCRUM-125); the rest upload an ordinary file.
const TEMPLATES: Record<string, string> = { CASHFLOW: "cashflow", MENU: "menu" };

const DOMAIN_CARDS: { value: string; label: string; note: string; icon: LucideIcon }[] = [
  { value: "CASHFLOW", label: "Cashflow", note: "Catatan uang masuk & keluar", icon: Wallet },
  { value: "RAB", label: "RAB", note: "Rencana anggaran per periode", icon: Utensils },
  { value: "PO", label: "Purchase Order", note: "Daftar pesanan ke supplier", icon: FileText },
  { value: "INPUT_MAKER", label: "Input Maker", note: "Permintaan bayar ke supplier (tanpa data rekening)", icon: Coins },
  { value: "VENDOR_PAYMENT", label: "Pembayaran Supplier", note: "Bukti bayar ke supplier (Input Maker / EFI)", icon: Coins },
  { value: "MENU", label: "Master Menu", note: "Menu & gizi yang direncanakan", icon: BookOpen },
  { value: "GOODS_RECEIPT", label: "Penerimaan Barang", note: "Barang yang diterima dapur", icon: Package },
];

const LABEL_TONE: Record<string, string> = {
  "Wajib diperbaiki": "bg-red-100 text-red-800",
  "Perlu dicek": "bg-amber-100 text-amber-800",
  "Dirapikan otomatis": "bg-slate-100 text-slate-700",
};

/** PRD §9.1 wording for what became of the uploaded file. */
function headline(r: Extract<UploadResult, { ok: true }>) {
  if (r.autoPublished) return "Dipublish otomatis";
  if (r.errorCode === "EMPTY_FILE") return "Ditahan · file kosong";
  if (r.status === "NEEDS_REVIEW") return "Perlu dicek";
  if (r.status === "NEEDS_MAPPING_UPDATE") return "Format berbeda";
  return "File belum dipublish";
}

/** FR-AI-01: one card for the picked file, before anything is stored. */
function CheckCard({ check }: { check: Extract<CheckResult, { ok: true }> }) {
  const problems = check.columnDiff.flatMap((d) => [
    ...d.missing.map((c) => ({ key: `${d.sheet}-m-${c}`, column: c, note: "Tidak ada, padahal wajib" })),
    ...d.unexpected.map((c) => ({ key: `${d.sheet}-u-${c}`, column: c, note: "Tidak dikenal" })),
  ]);
  return (
    <section aria-live="polite" className={`space-y-3 rounded-xl border p-4 text-sm ${check.ready ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
      <p className={`text-base font-semibold ${check.ready ? "text-emerald-800" : "text-amber-800"}`}>{check.ready ? "Siap diunggah" : "Perlu dicek"}</p>
      {check.issues.length > 0 && (
        <ul className="space-y-1.5">
          {check.issues.map((i) => (
            <li key={i.code} className="flex flex-wrap items-baseline gap-2 text-slate-800">
              <span className={`rounded px-2 py-0.5 text-xs font-semibold ${LABEL_TONE[i.label] ?? LABEL_TONE["Perlu dicek"]}`}>{i.label}</span>
              <span>{i.message}</span>
              {i.count > 1 && <span className="text-slate-500">({i.count} baris)</span>}
            </li>
          ))}
        </ul>
      )}
      {problems.length > 0 && (
        <table className="w-full max-w-xl text-left">
          <thead className="border-b border-slate-200 text-slate-500">
            <tr>
              <th className="py-2 pr-4 font-medium">Kolom di file</th>
              <th className="py-2 font-medium">Masalah</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {problems.map((p) => (
              <tr key={p.key}>
                <td className="py-2 pr-4 font-medium text-slate-800">{p.column}</td>
                <td className="py-2 text-slate-700">{p.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {check.ai && (check.ai.columns.length > 0 || check.ai.issues.length > 0) && (
        <div className="space-y-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-blue-900">
          <p className="font-semibold">Saran AI</p>
          <ul className="list-inside list-disc">
            {check.ai.columns.map((c) => (
              <li key={c.header}>
                Kolom <span className="font-medium">{c.header}</span>: {c.readAs ? `dibaca sebagai ${c.readAs}. ` : ""}
                {c.reason}
              </li>
            ))}
            {check.ai.issues.map((i) => (
              <li key={i.code}>{i.advice}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export function UploadForm({ kitchens, kitchenId }: { kitchens: Kitchen[]; kitchenId?: string }) {
  const [result, action, pending] = useActionState<UploadResult | null, FormData>(uploadFile, null);
  const [kitchen, setKitchen] = useState(kitchenId ?? kitchens[0].id);
  const [domain, setDomain] = useState("CASHFLOW");
  const [check, setCheck] = useState<CheckResult | null>(null);
  const [checking, startChecking] = useTransition();
  // "Unggah ulang" goes back to the file pick without dropping kitchen/domain.
  const [retry, setRetry] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const showResult = result?.ok && !retry;

  /** Reads the picked file again with the form as it will be sent; `over` carries a value the state has not flushed yet. */
  const runCheck = (over: Record<string, string> = {}) => {
    if (!formRef.current || !fileRef.current?.files?.length) return setCheck(null);
    const data = new FormData(formRef.current);
    for (const [name, value] of Object.entries(over)) data.set(name, value);
    startChecking(async () => setCheck(await checkFile(data)));
  };
  const clearFile = () => {
    if (fileRef.current) fileRef.current.value = "";
    setCheck(null);
  };

  return (
    // Not `action={action}`: React resets the form after an action, which empties the file input
    // while `file` still shows its name, so a failed upload would need the file picked again.
    <form
      ref={formRef}
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
        {kitchens.length > 1 ? (
          <label className="block space-y-2 text-sm">
            <span className="font-semibold text-slate-800">Dapur</span>
            <select
              value={kitchen}
              onChange={(e) => {
                setKitchen(e.target.value);
                runCheck({ kitchenId: e.target.value });
              }}
              className={`${field} max-w-md`}
            >
              {kitchens.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.code ? `${k.code} · ${k.name}` : k.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          // SCRUM-144: Data Operasional is tied to one dapur, so there is nothing to pick.
          <p className="text-sm font-semibold text-slate-800">Dapur: {kitchens[0]!.code ? `${kitchens[0]!.code} · ${kitchens[0]!.name}` : kitchens[0]!.name}</p>
        )}

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-slate-800">Jenis data</legend>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {DOMAIN_CARDS.map(({ value, label, note, icon: Icon }) => (
              <button
                key={label}
                type="button"
                aria-pressed={value === domain}
                onClick={() => {
                  setDomain(value);
                  runCheck({ domain: value });
                }}
                className={choice(value === domain)}
              >
                <span className="flex items-center gap-2 font-semibold">
                  <Icon className="size-4 shrink-0 text-slate-500" aria-hidden="true" />
                  {label}
                </span>
                <span className="mt-2 block text-sm text-slate-500">{note}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <label className="block space-y-2 text-sm">
          <span className="font-semibold text-slate-800">
            Bulan <span className="font-normal text-slate-500">(opsional)</span>
          </span>
          <input type="month" name="period" className={`${field} max-w-xs`} />
        </label>

        <div className="space-y-2">
          <label className="block space-y-1 text-sm">
            <span className="font-semibold text-slate-800">File (.xlsx atau .csv, maks. 10 MB)</span>
            <input
              ref={fileRef}
              type="file"
              name="file"
              accept=".xlsx,.csv"
              required
              onChange={() => {
                // A new pick hides the previous upload's result.
                setRetry(true);
                runCheck();
              }}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium"
            />
          </label>
          {TEMPLATES[domain] && (
            <a href={`unggah-data/template/${TEMPLATES[domain]}`} download className="inline-block text-sm font-medium text-emerald-700 underline">
              Download template
            </a>
          )}
        </div>

        {checking && <p className="text-sm text-slate-600">Membaca dan mengecek file…</p>}
        {!showResult && !pending && !checking && check && !check.ok && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {check.message}
          </p>
        )}
        {!showResult && !pending && !checking && check?.ok && <CheckCard check={check} />}
        {result && !result.ok && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {result.message}
          </p>
        )}

        {showResult && (
          <section aria-live="polite" className="space-y-3 text-sm">
            <p className={`rounded-md p-3 font-medium ${result.autoPublished ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>{headline(result)}</p>
            {result.errorSummary && <p className="text-slate-700">{result.errorSummary}</p>}
            {result.warning && <p className="rounded-md bg-amber-50 p-3 text-amber-800">{result.warning}</p>}
            <div className="flex flex-wrap items-center gap-4">
              {result.status !== "NEEDS_REVIEW" && result.status !== "PUBLISHED" && (
                <button
                  type="button"
                  onClick={() => {
                    setRetry(true);
                    clearFile();
                  }}
                  className={primaryButton}
                >
                  Unggah Ulang File
                </button>
              )}
              {result.status === "NEEDS_REVIEW" && (
                <Link href="/mapping-validasi" className="inline-block font-medium text-emerald-700 hover:underline">
                  Ke Validasi Data
                </Link>
              )}
            </div>
          </section>
        )}

        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={pending || checking || !check} className={primaryButton}>
            {pending ? "Mengunggah…" : "Unggah"}
          </button>
          <button type="button" onClick={clearFile} disabled={pending || !check} className={secondaryButton}>
            Ubah Mapping
          </button>
        </div>
      </Card>
    </form>
  );
}
