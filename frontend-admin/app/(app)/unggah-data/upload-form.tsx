"use client";

import { ArrowRight, Building2, Check, CircleCheck, CircleX, Download, FileText, Sparkles, TriangleAlert, Upload } from "lucide-react";
import Link from "next/link";
import { startTransition, useActionState, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { checkFile, uploadFile, type CheckResult, type FileColumn, type UploadResult } from "./actions";
import { ValidasiGrid } from "./validasi-grid";
import { useLang, useT } from "@/components/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MorphSelect } from "@/components/ui/morph-select";
import { dateLocale, type T } from "@/lib/lang";
import type { Kitchen } from "@/lib/me";

const field = "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20";
const primaryButton = "inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60";
const secondaryButton = "inline-flex h-10 items-center gap-2 rounded-lg border border-emerald-700 px-4 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-60";
// Domains with an official empty template (SCRUM-125); the rest upload an ordinary file.
const TEMPLATES: Record<string, string> = { CASHFLOW: "cashflow", MENU: "menu" };

const DOMAIN_OPTIONS = [
  { value: "CASHFLOW", label: "Cashflow" },
  { value: "RAB", label: "RAB" },
  { value: "PO", label: "Purchase Order" },
  { value: "INPUT_MAKER", label: "Input Maker" },
  { value: "VENDOR_PAYMENT", label: "Pembayaran Supplier" },
  { value: "MENU", label: "Master Menu" },
  { value: "GOODS_RECEIPT", label: "Penerimaan Barang" },
];

// Words in a file name that give away its domain, e.g. "03_master_menu.xlsx" or "CASHFLOW_SUKUN - Transaksi_Kas.csv".
const DOMAIN_WORDS: [string, RegExp][] = [
  ["INPUT_MAKER", /\binput maker\b|\binputmaker\b/],
  ["GOODS_RECEIPT", /\bpenerimaan\b|\breceipt\b|\bgr\b/],
  ["VENDOR_PAYMENT", /\bpembayaran\b|\bpayment\b/],
  ["PO", /\bpo\b|\bpurchase order\b/],
  ["RAB", /\brab\b/],
  ["MENU", /\bmenu\b/],
  ["CASHFLOW", /\bcashflow\b|\bkas\b|\btransaksi\b/],
];

/** The domain a file name points to, or null when it says nothing (the picked one then stays). */
const detectDomain = (fileName: string) => {
  const name = fileName.toLowerCase().replace(/\.[a-z]+$/, "").replace(/[^a-z0-9]+/g, " ");
  return DOMAIN_WORDS.find(([, re]) => re.test(name))?.[0] ?? null;
};

const LABEL_TONE: Record<string, string> = {
  "Wajib diperbaiki": "border-red-200 bg-red-50 text-red-700",
  "Perlu dicek": "border-amber-200 bg-amber-50 text-amber-700",
  "Dirapikan otomatis": "border-slate-200 bg-slate-50 text-slate-600",
};

/** PRD §9.1 wording for what became of the uploaded file. */
function headline(t: T, r: Extract<UploadResult, { ok: true }>) {
  if (r.autoPublished) return t("Dipublish otomatis");
  if (r.status === "PUBLISHED") return t("Dipublish");
  if (r.errorCode === "EMPTY_FILE") return t("Ditahan · file kosong");
  if (r.status === "NEEDS_REVIEW") return t("Perlu dicek");
  if (r.status === "NEEDS_MAPPING_UPDATE") return t("Format berbeda");
  return t("File belum dipublish");
}

const RESULT_TONE = {
  ok: { card: "border-emerald-200 bg-emerald-50/40", badge: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  review: { card: "border-amber-200 bg-amber-50/40", badge: "border-amber-200 bg-amber-50 text-amber-700" },
  fail: { card: "border-red-200 bg-red-50/40", badge: "border-red-200 bg-red-50 text-red-700" },
};
const resultTone = (r: Extract<UploadResult, { ok: true }>) => (r.status === "PUBLISHED" ? "ok" : r.status === "NEEDS_REVIEW" ? "review" : "fail");

/** FR-AI-01: the verdict on the picked file, before anything is stored. */
function CheckChips({ check }: { check: Extract<CheckResult, { ok: true }> }) {
  const t = useT();
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="font-medium text-slate-600">{t("Validasi otomatis")}</span>
      <span className="text-slate-300" aria-hidden="true">•</span>
      <span className="text-slate-500">{check.rowCount} {t("baris")}</span>
      <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-medium ${check.ready ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
        {check.ready ? <Check className="size-3" aria-hidden="true" /> : <TriangleAlert className="size-3" aria-hidden="true" />}
        {check.ready ? t("Siap diunggah") : `${check.issues.length} ${t("perlu dicek")}`}
      </span>
    </div>
  );
}

/** What the check found: the issues, the columns that differ and the AI's advice. */
function CheckDetails({ check }: { check: Extract<CheckResult, { ok: true }> }) {
  const t = useT();
  const problems = check.columnDiff.flatMap((d) => [
    ...d.missing.map((c) => ({ key: `${d.sheet}-m-${c}`, column: c, note: t("Tidak ada, padahal wajib") })),
    ...d.unexpected.map((c) => ({ key: `${d.sheet}-u-${c}`, column: c, note: t("Tidak dikenal") })),
  ]);
  const advice = check.ai && (check.ai.columns.length > 0 || check.ai.issues.length > 0);
  if (!check.issues.length && !problems.length && !advice) return null;
  return (
    <section aria-live="polite" className="space-y-3 text-sm">
      {check.issues.length > 0 && (
        <ul className="space-y-1.5">
          {check.issues.map((i) => (
            <li key={i.code} className="flex flex-wrap items-baseline gap-2 text-slate-800">
              <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${LABEL_TONE[i.label] ?? LABEL_TONE["Perlu dicek"]}`}>{t(i.label)}</span>
              <span>{i.message}</span>
              {i.count > 1 && <span className="text-slate-500">({i.count} {t("baris")})</span>}
            </li>
          ))}
        </ul>
      )}
      {problems.length > 0 && (
        <table className="w-full max-w-xl text-left">
          <thead className="border-b border-slate-200 text-slate-500">
            <tr>
              <th className="py-2 pr-4 font-medium">{t("Kolom di file")}</th>
              <th className="py-2 font-medium">{t("Masalah")}</th>
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
          <p className="font-semibold">{t("Saran AI")}</p>
          <ul className="list-inside list-disc">
            {check.ai.columns.map((c) => (
              <li key={c.header}>
                {t("Kolom")} <span className="font-medium">{c.header}</span>: {c.readAs ? t("dibaca sebagai {field}. ", { field: c.readAs }) : ""}
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

const STEPS = ["File diterima", "AI mengenali format file", "Membaca isi file", "AI mencocokkan kolom", "AI mengecek isi data"];

/** The upload is one request, so the steps advance on a timer; the last one keeps spinning until the result arrives. */
function UploadProgress({ children }: { children?: ReactNode }) {
  const t = useT();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((s) => Math.min(s + 1, STEPS.length - 1)), 1500);
    return () => clearInterval(id);
  }, []);
  // With a result every step is done, whatever the verdict on the file.
  const step = children ? STEPS.length : tick;
  return (
    <div role="status" className="grid gap-6 rounded-xl border border-slate-200 p-5 md:grid-cols-[minmax(0,1fr)_2fr]">
      <ul className="space-y-3 text-sm">
        {STEPS.map((label, i) => (
          <li key={label} className={`flex items-center gap-3 ${i > step ? "text-slate-600" : "text-slate-800"}`}>
            {i < step ? (
              <span className="grid size-6 place-items-center rounded-full bg-emerald-700 text-white">
                <Check className="size-3.5" aria-hidden="true" />
              </span>
            ) : (
              <span className={`size-6 rounded-full border-2 ${i === step ? "animate-spin border-sky-600 border-t-transparent" : "border-slate-200"}`} aria-hidden="true" />
            )}
            {t(label)}
          </li>
        ))}
      </ul>
      {children ?? (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-5" aria-hidden="true">
          <div className="h-4 w-2/5 animate-pulse rounded-full bg-slate-200" />
          <div className="h-4 w-4/5 animate-pulse rounded-full bg-slate-200" />
          <div className="h-4 w-3/5 animate-pulse rounded-full bg-slate-200" />
          <p className="pt-2 text-sm text-slate-500">{t("Sedang diproses...")}</p>
        </div>
      )}
    </div>
  );
}

type ColumnMap = Record<string, string>;
const size = (bytes: number) => (bytes < 1_048_576 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1_048_576).toFixed(1)} MB`);
const mapKey = (c: FileColumn) => `${c.sheet}|${c.column}`;

/** Step 2 of "Validasi Data": each header of the file next to the SOP field it is read as; every pick is re-checked by the backend. */
function MappingStep({
  check,
  map,
  fileName,
  domain,
  busy,
  onPick,
  onBack,
  onSave,
}: {
  check: Extract<CheckResult, { ok: true }>;
  map: ColumnMap;
  fileName: string;
  domain: string;
  busy: boolean;
  onPick: (column: FileColumn, field: string) => void;
  onBack: () => void;
  onSave: () => void;
}) {
  const t = useT();
  const sheets = new Set(check.columns.map((c) => c.sheet)).size;
  const fieldOf = (c: FileColumn) => map[mapKey(c)] ?? c.field ?? "";
  const matched = check.columns.filter((c) => fieldOf(c)).length;
  // SCRUM-150: the AI's note on a header it could not place with certainty.
  const notes = new Map(check.ai?.columns.map((c) => [c.header, c.reason]) ?? []);
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4">
        <p className="flex min-w-0 items-center gap-3 font-semibold text-slate-900">
          <FileText className="size-5 shrink-0 text-slate-400" aria-hidden="true" />
          <span className="truncate">{fileName}</span>
        </p>
        <Badge tone="slate">{t(DOMAIN_OPTIONS.find((o) => o.value === domain)?.label ?? domain)}</Badge>
      </div>
      <p aria-live="polite" className="flex items-start gap-2 rounded-xl bg-slate-100 p-4 text-sm text-slate-800">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-sky-600" aria-hidden="true" />
        {busy
          ? t("AI mencocokkan kolom…")
          : t("AI mencocokkan {matched} dari {total} kolom. {rest} kolom perlu dicek.", { matched, total: check.columns.length, rest: check.columns.length - matched })}
      </p>
      <div className="rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">{t("Kolom di file")}</th>
              <th className="px-4 py-3 font-medium">{t("Dibaca sebagai")}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {check.columns.map((c) => {
              const key = mapKey(c);
              const note = key in map ? undefined : notes.get(c.header);
              return (
                <tr key={key}>
                  <td className="px-4 py-3">
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-800">{c.header}</code>
                    {sheets > 1 && <span className="ml-2 text-xs text-slate-500">{c.sheet}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <MorphSelect
                      label={t("Dibaca sebagai untuk kolom {header}", { header: c.header })}
                      value={fieldOf(c)}
                      onChange={(v) => onPick(c, v)}
                      className="w-full max-w-xs"
                      options={[{ value: "", label: t("Abaikan kolom ini") }, ...check.fields.map((f) => ({ value: f.field, label: f.header }))]}
                    />
                  </td>
                  <td className="px-4 py-3">
                    {note ? (
                      <span title={note} className="inline-flex h-6 items-center rounded-md border border-sky-200 bg-sky-50 px-2 text-xs font-medium text-sky-700">
                        {t("Perlu dicek")}
                      </span>
                    ) : fieldOf(c) ? (
                      <span className="text-slate-500">{t("Cocok")}</span>
                    ) : (
                      <Badge tone="slate">{t("Tidak dikenali")}</Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" onClick={onBack} className={secondaryButton}>
          {t("Kembali")}
        </button>
        <button type="button" onClick={onSave} disabled={busy} className={primaryButton}>
          <Sparkles className="size-4" aria-hidden="true" />
          {t("Simpan & Cek dengan AI")}
        </button>
      </div>
    </section>
  );
}

export function UploadForm({ kitchens, kitchenId }: { kitchens: Kitchen[]; kitchenId?: string }) {
  const t = useT();
  const [result, action, pending] = useActionState<UploadResult | null, FormData>(uploadFile, null);
  const [kitchen, setKitchen] = useState(kitchenId ?? kitchens[0].id);
  const [domain, setDomain] = useState("CASHFLOW");
  const [check, setCheck] = useState<CheckResult | null>(null);
  const [checking, startChecking] = useTransition();
  // "Unggah ulang" goes back to the file pick without dropping kitchen/domain.
  const [retry, setRetry] = useState(false);
  // The uploader's overrides of how the file's columns are read, per file.
  const [columnMap, setColumnMap] = useState<ColumnMap>({});
  // "Validasi Data": pick the file → match its columns → check and edit its rows, then Publish.
  const [step, setStep] = useState<"pick" | "mapping" | "grid">("pick");
  // The grid stays mounted once opened, so going back to the mapping keeps its edits.
  const [gridOpen, setGridOpen] = useState(false);
  const [file, setFile] = useState<{ name: string; size: number } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const locale = dateLocale(useLang());
  const day = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
  const found = check?.ok ? check.dateRange : null;
  const range = !found ? "" : found.from === found.to ? day(found.from) : `${day(found.from)} – ${day(found.to)}`;
  const showResult = result?.ok && !retry;
  const validating = check?.ok && step !== "pick" ? check : null;
  // Progress and verdict take the place of the inputs.
  const overlay = pending || showResult;

  /** Reads the picked file again with the form as it will be sent; `over` carries a value the state has not flushed yet. */
  const runCheck = (over: Record<string, string> = {}) => {
    if (!formRef.current || !fileRef.current?.files?.length) return setCheck(null);
    const data = new FormData(formRef.current);
    for (const [name, value] of Object.entries(over)) data.set(name, value);
    startChecking(async () => setCheck(await checkFile(data)));
  };
  const clearFile = () => {
    if (fileRef.current) fileRef.current.value = "";
    setFile(null);
    setCheck(null);
    resetMapping();
  };
  // A new file, kitchen or domain has other columns and another SOP: overrides do not carry over.
  const resetMapping = () => {
    setColumnMap({});
    setStep("pick");
    setGridOpen(false);
  };
  const pick = (check: Extract<CheckResult, { ok: true }>, column: FileColumn, field: string) => {
    const next = { ...columnMap, [mapKey(column)]: field };
    // One SOP field is read from one column: whichever column held it lets go.
    if (field) for (const o of check.columns) if (o !== column && (columnMap[mapKey(o)] ?? o.field) === field) next[mapKey(o)] = "";
    setColumnMap(next);
    runCheck({ columnMap: JSON.stringify(next) });
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
      <input type="hidden" name="columnMap" value={Object.keys(columnMap).length ? JSON.stringify(columnMap) : ""} />
      {/* SCRUM-124: re-uploading a quarantined file closes it as "Diganti". */}
      {retry && result?.ok && result.status === "NEEDS_MAPPING_UPDATE" && <input type="hidden" name="replaces" value={result.batchId} />}

      <Card className="space-y-5 p-6">
        {/* Hidden, not unmounted: the file input must keep its file if the upload fails. */}
        <div className={overlay ? "hidden" : "space-y-5"}>
        <div className={validating ? "hidden" : "space-y-5"}>
        <div className="grid gap-4 sm:grid-cols-3">
          {kitchens.length > 1 ? (
            <div className="space-y-2 text-sm">
              <span className="block font-semibold text-slate-800">{t("Dapur")}</span>
              <MorphSelect
                label={t("Dapur")}
                value={kitchen}
                onChange={(v) => {
                  setKitchen(v);
                  resetMapping();
                  runCheck({ kitchenId: v, columnMap: "" });
                }}
                className="w-full"
                options={kitchens.map((k) => ({ value: k.id, label: k.code ? `${k.code} · ${k.name}` : k.name }))}
              />
            </div>
          ) : (
            // SCRUM-144: Data Operasional is tied to one dapur, so there is nothing to pick.
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-slate-800">{t("Dapur")}</p>
              <p className="flex h-10 items-center gap-2 font-semibold text-slate-800">
                <Building2 className="size-4 shrink-0 text-slate-500" aria-hidden="true" />
                {kitchens[0]!.code ? `${kitchens[0]!.code} · ${kitchens[0]!.name}` : kitchens[0]!.name}
              </p>
            </div>
          )}

          <div className="space-y-2 text-sm">
            <span className="block font-semibold text-slate-800">{t("Jenis data")}</span>
            <MorphSelect
              label={t("Jenis data")}
              value={domain}
              onChange={(v) => {
                setDomain(v);
                resetMapping();
                runCheck({ domain: v, columnMap: "" });
              }}
              className="w-full"
              options={DOMAIN_OPTIONS.map((o) => ({ ...o, label: t(o.label) }))}
            />
          </div>

          <label className="block space-y-2 text-sm">
            <span className="font-semibold text-slate-800">{t("Bulan")}</span>
            <input type="text" disabled value={range} placeholder={t("Mengikuti tanggal di dalam file")} className={`${field} disabled:bg-slate-50 disabled:text-slate-500`} />
          </label>
        </div>

        <input
          ref={fileRef}
          type="file"
          name="file"
          accept=".xlsx,.csv"
          required
          aria-label={t("File (.xlsx atau .csv, maks. 10 MB)")}
          className="sr-only"
          onChange={(e) => {
            const picked = e.target.files?.[0];
            setFile(picked ? { name: picked.name, size: picked.size } : null);
            // A new pick hides the previous upload's result.
            setRetry(true);
            resetMapping();
            // The domain follows the file name; the check must read it with that domain, the state has not flushed yet.
            const detected = picked ? detectDomain(picked.name) : null;
            if (detected) setDomain(detected);
            runCheck({ columnMap: "", ...(detected && { domain: detected }) });
          }}
        />
        {file ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-4">
            <div className="flex min-w-0 items-center gap-3">
              <FileText className="size-5 shrink-0 text-slate-400" aria-hidden="true" />
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-800">{file.name}</p>
                <p className="text-sm text-slate-500">
                  {size(file.size)}
                  {check?.ok && ` · ${check.rowCount.toLocaleString("id-ID")} ${t("baris")}`}
                </p>
              </div>
            </div>
            <button type="button" onClick={() => fileRef.current?.click()} disabled={pending} className="shrink-0 text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-60">
              {t("Ganti file")}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 p-6 text-sm font-medium text-slate-600 hover:border-emerald-400 hover:text-emerald-700"
          >
            <Upload className="size-4" aria-hidden="true" />
            {t("Pilih file (.xlsx atau .csv, maks. 10 MB)")}
          </button>
        )}
        {TEMPLATES[domain] && (
          <a href={`unggah-data/template/${TEMPLATES[domain]}`} download className="inline-block text-sm font-medium text-emerald-700 underline">
            {t("Download template")}
          </a>
        )}

        {file && (
          <div className="space-y-4 rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {checking ? (
                <p className="text-sm text-slate-600">{t("Membaca dan mengecek file…")}</p>
              ) : check?.ok && !showResult && !pending ? (
                <CheckChips check={check} />
              ) : (
                <span />
              )}
              <button type="button" onClick={() => setStep("mapping")} disabled={pending || checking || !check?.ok} className={primaryButton}>
                {t("Validasi Data")}
                <ArrowRight className="size-4" aria-hidden="true" />
              </button>
            </div>
            {!showResult && !pending && !checking && check && !check.ok && (
              <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                {check.message}
              </p>
            )}
            {!showResult && !pending && !checking && check?.ok && <CheckDetails check={check} />}
          </div>
        )}
        </div>

        {validating && step === "mapping" && (
          <MappingStep
            check={validating}
            map={columnMap}
            fileName={file?.name ?? ""}
            domain={domain}
            busy={pending || checking}
            onPick={(c, f) => pick(validating, c, f)}
            onBack={() => setStep("pick")}
            onSave={() => {
              setStep("grid");
              setGridOpen(true);
            }}
          />
        )}
        {validating && gridOpen && (
          <div className={step === "grid" ? "" : "hidden"}>
            <ValidasiGrid check={validating} fileName={file?.name ?? ""} busy={pending || checking} onBack={() => setStep("mapping")} />
          </div>
        )}
        </div>

        {result && !result.ok && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {result.message}
          </p>
        )}

        {overlay && (
          <UploadProgress>
            {showResult && (
              <section aria-live="polite" className={`space-y-3 rounded-xl border p-5 text-sm ${RESULT_TONE[resultTone(result)].card}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="flex items-center gap-2 text-base font-semibold text-slate-800">
                    {resultTone(result) === "ok" ? <CircleCheck className="size-5" aria-hidden="true" /> : <CircleX className="size-5" aria-hidden="true" />}
                    {resultTone(result) === "ok" ? t("File berhasil dibaca") : resultTone(result) === "review" ? t("File sudah dibaca") : t("File belum bisa diproses")}
                  </p>
                  <span className={`inline-flex items-center gap-1 rounded-md border px-3 py-1 text-xs font-medium ${RESULT_TONE[resultTone(result)].badge}`}>
                    {result.status === "PUBLISHED" && <Check className="size-3" aria-hidden="true" />}
                    {headline(t, result)}
                  </span>
                </div>
                {result.autoPublished && (
                  <p className="text-slate-600">
                    {file?.name}
                    {check?.ok && ` · ${check.rowCount.toLocaleString("id-ID")} ${t("baris terbaca")}`}. {t("Tidak ada masalah, file langsung dipublish. Data sudah tampil di dashboard.")}
                  </p>
                )}
                {result.errorSummary && <p className="text-slate-600">{result.errorSummary}</p>}
                {result.warning && <p className="rounded-md bg-amber-50 p-3 text-amber-800">{result.warning}</p>}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="flex items-center gap-1.5 text-slate-500">
                    {result.status === "PUBLISHED" && (
                      <>
                        <Check className="size-4" aria-hidden="true" />
                        {t("Sudah dipublish.")}
                      </>
                    )}
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                  {result.status === "PUBLISHED" && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setRetry(true);
                          clearFile();
                        }}
                        className={secondaryButton}
                      >
                        {t("Unggah file lain")}
                      </button>
                      <Link href="/overview" className={primaryButton}>
                        {t("Lihat di Overview")}
                        <ArrowRight className="size-4" aria-hidden="true" />
                      </Link>
                    </>
                  )}
                  {TEMPLATES[domain] && result.status !== "PUBLISHED" && (
                    <a href={`unggah-data/template/${TEMPLATES[domain]}`} download className={secondaryButton}>
                      <Download className="size-4" aria-hidden="true" />
                      {t("Download Template")}
                    </a>
                  )}
                  {result.status !== "NEEDS_REVIEW" && result.status !== "PUBLISHED" && (
                    <button
                      type="button"
                      onClick={() => {
                        setRetry(true);
                        clearFile();
                      }}
                      className={primaryButton}
                    >
                      <Upload className="size-4" aria-hidden="true" />
                      {t("Unggah Ulang File")}
                    </button>
                  )}
                  {result.status === "NEEDS_REVIEW" && (
                    <Link href="/mapping-validasi" className={primaryButton}>
                      {t("Ke Upload History")}
                    </Link>
                  )}
                  </div>
                </div>
              </section>
            )}
          </UploadProgress>
        )}
      </Card>
    </form>
  );
}
