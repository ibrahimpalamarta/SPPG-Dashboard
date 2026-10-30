"use client";

import { Building2, Check, FileText, TriangleAlert, Upload } from "lucide-react";
import Link from "next/link";
import { startTransition, useActionState, useRef, useState, useTransition } from "react";
import { checkFile, uploadFile, type CheckResult, type FileColumn, type UploadResult } from "./actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MorphSelect } from "@/components/ui/morph-select";
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

const LABEL_TONE: Record<string, string> = {
  "Wajib diperbaiki": "border-red-200 bg-red-50 text-red-700",
  "Perlu dicek": "border-amber-200 bg-amber-50 text-amber-700",
  "Dirapikan otomatis": "border-slate-200 bg-slate-50 text-slate-600",
};

/** PRD §9.1 wording for what became of the uploaded file. */
function headline(r: Extract<UploadResult, { ok: true }>) {
  if (r.autoPublished) return "Dipublish otomatis";
  if (r.errorCode === "EMPTY_FILE") return "Ditahan · file kosong";
  if (r.status === "NEEDS_REVIEW") return "Perlu dicek";
  if (r.status === "NEEDS_MAPPING_UPDATE") return "Format berbeda";
  return "File belum dipublish";
}

/** FR-AI-01: the verdict on the picked file, before anything is stored. */
function CheckChips({ check }: { check: Extract<CheckResult, { ok: true }> }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="font-medium text-slate-600">Validasi otomatis</span>
      <span className="text-slate-300" aria-hidden="true">•</span>
      <span className="text-slate-500">{check.rowCount} baris</span>
      <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-medium ${check.ready ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
        {check.ready ? <Check className="size-3" aria-hidden="true" /> : <TriangleAlert className="size-3" aria-hidden="true" />}
        {check.ready ? "Siap diunggah" : `${check.issues.length} perlu dicek`}
      </span>
    </div>
  );
}

/** What the check found: the issues, the columns that differ and the AI's advice. */
function CheckDetails({ check }: { check: Extract<CheckResult, { ok: true }> }) {
  const problems = check.columnDiff.flatMap((d) => [
    ...d.missing.map((c) => ({ key: `${d.sheet}-m-${c}`, column: c, note: "Tidak ada, padahal wajib" })),
    ...d.unexpected.map((c) => ({ key: `${d.sheet}-u-${c}`, column: c, note: "Tidak dikenal" })),
  ]);
  const advice = check.ai && (check.ai.columns.length > 0 || check.ai.issues.length > 0);
  if (!check.issues.length && !problems.length && !advice) return null;
  return (
    <section aria-live="polite" className="space-y-3 text-sm">
      {check.issues.length > 0 && (
        <ul className="space-y-1.5">
          {check.issues.map((i) => (
            <li key={i.code} className="flex flex-wrap items-baseline gap-2 text-slate-800">
              <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${LABEL_TONE[i.label] ?? LABEL_TONE["Perlu dicek"]}`}>{i.label}</span>
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

type ColumnMap = Record<string, string>;
const size = (bytes: number) => (bytes < 1_048_576 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1_048_576).toFixed(1)} MB`);
const mapKey = (c: FileColumn) => `${c.sheet}|${c.column}`;

/** "Ubah Mapping": each header of the file next to the SOP field it is read as; every pick is re-checked by the backend. */
function MappingEditor({
  check,
  map,
  busy,
  onPick,
  onDone,
}: {
  check: Extract<CheckResult, { ok: true }>;
  map: ColumnMap;
  busy: boolean;
  onPick: (column: FileColumn, field: string) => void;
  onDone: () => void;
}) {
  const sheets = new Set(check.columns.map((c) => c.sheet)).size;
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CheckChips check={check} />
        <div className="flex gap-3">
          <button type="button" onClick={onDone} className={secondaryButton}>
            Selesai
          </button>
          <button type="submit" disabled={busy} className={primaryButton}>
            <Upload className="size-4" aria-hidden="true" />
            Unggah
          </button>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Kolom di file</th>
              <th className="px-4 py-3 font-medium">Dibaca sebagai (kolom SOP)</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {check.columns.map((c) => {
              const key = mapKey(c);
              const changed = key in map;
              return (
                <tr key={key}>
                  <td className="px-4 py-3">
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-800">{c.header}</code>
                    {sheets > 1 && <span className="ml-2 text-xs text-slate-500">{c.sheet}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <MorphSelect
                      label={`Dibaca sebagai untuk kolom ${c.header}`}
                      value={map[key] ?? c.field ?? ""}
                      onChange={(v) => onPick(c, v)}
                      className="w-full max-w-xs"
                      options={[{ value: "", label: "Tidak dipakai" }, ...check.fields.map((f) => ({ value: f.field, label: f.header }))]}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {changed ? <Badge tone="amber">Diubah</Badge> : c.field ? <Badge tone="green">Yakin</Badge> : <Badge tone="slate">Tidak dipakai</Badge>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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
  // "Ubah Mapping": the uploader's overrides of how the file's columns are read, per file.
  const [columnMap, setColumnMap] = useState<ColumnMap>({});
  const [editing, setEditing] = useState(false);
  const [file, setFile] = useState<{ name: string; size: number } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const showResult = result?.ok && !retry;
  const mapping = check?.ok && editing ? check : null;

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
    setEditing(false);
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
        setEditing(false);
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
        <div className="grid gap-4 sm:grid-cols-3">
          {kitchens.length > 1 ? (
            <div className="space-y-2 text-sm">
              <span className="block font-semibold text-slate-800">Dapur</span>
              <MorphSelect
                label="Dapur"
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
              <p className="font-semibold text-slate-800">Dapur</p>
              <p className="flex h-10 items-center gap-2 font-semibold text-slate-800">
                <Building2 className="size-4 shrink-0 text-slate-500" aria-hidden="true" />
                {kitchens[0]!.code ? `${kitchens[0]!.code} · ${kitchens[0]!.name}` : kitchens[0]!.name}
              </p>
            </div>
          )}

          <div className="space-y-2 text-sm">
            <span className="block font-semibold text-slate-800">Jenis data</span>
            <MorphSelect
              label="Jenis data"
              value={domain}
              onChange={(v) => {
                setDomain(v);
                resetMapping();
                runCheck({ domain: v, columnMap: "" });
              }}
              className="w-full"
              options={DOMAIN_OPTIONS}
            />
          </div>

          <label className="block space-y-2 text-sm">
            <span className="font-semibold text-slate-800">
              Bulan <span className="font-normal text-slate-500">(opsional)</span>
            </span>
            <input type="month" name="period" className={field} />
          </label>
        </div>

        <input
          ref={fileRef}
          type="file"
          name="file"
          accept=".xlsx,.csv"
          required
          aria-label="File (.xlsx atau .csv, maks. 10 MB)"
          className="sr-only"
          onChange={(e) => {
            const picked = e.target.files?.[0];
            setFile(picked ? { name: picked.name, size: picked.size } : null);
            // A new pick hides the previous upload's result.
            setRetry(true);
            resetMapping();
            runCheck({ columnMap: "" });
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
                  {check?.ok && ` · ${check.rowCount.toLocaleString("id-ID")} baris`}
                </p>
              </div>
            </div>
            <button type="button" onClick={() => fileRef.current?.click()} disabled={pending} className="shrink-0 text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-60">
              Ganti file
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 p-6 text-sm font-medium text-slate-600 hover:border-emerald-400 hover:text-emerald-700"
          >
            <Upload className="size-4" aria-hidden="true" />
            Pilih file (.xlsx atau .csv, maks. 10 MB)
          </button>
        )}
        {TEMPLATES[domain] && (
          <a href={`unggah-data/template/${TEMPLATES[domain]}`} download className="inline-block text-sm font-medium text-emerald-700 underline">
            Download template
          </a>
        )}

        {mapping ? (
          <MappingEditor check={mapping} map={columnMap} busy={pending || checking} onPick={(c, f) => pick(mapping, c, f)} onDone={() => setEditing(false)} />
        ) : (
          file && (
            <div className="space-y-4 rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {checking ? (
                  <p className="text-sm text-slate-600">Membaca dan mengecek file…</p>
                ) : check?.ok && !showResult && !pending ? (
                  <CheckChips check={check} />
                ) : (
                  <span />
                )}
                <div className="flex gap-3">
                  <button type="button" onClick={() => setEditing(true)} disabled={pending || !check?.ok || !check.columns.length} className={secondaryButton}>
                    Ubah Mapping
                  </button>
                  <button type="submit" disabled={pending || checking || !check} className={primaryButton}>
                    {pending ? "Mengunggah…" : "Unggah"}
                  </button>
                </div>
              </div>
              {!showResult && !pending && !checking && check && !check.ok && (
                <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                  {check.message}
                </p>
              )}
              {!showResult && !pending && !checking && check?.ok && <CheckDetails check={check} />}
            </div>
          )
        )}

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
      </Card>
    </form>
  );
}
