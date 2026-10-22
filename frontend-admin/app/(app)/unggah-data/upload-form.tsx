"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { uploadFile, type UploadResult } from "./actions";
import { DOMAINS, StatusBadge } from "@/lib/upload";
import type { Kitchen } from "@/lib/me";

const field = "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20";

const formatSize = (bytes: number) => (bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

export function UploadForm({ kitchens, kitchenId }: { kitchens: Kitchen[]; kitchenId?: string }) {
  const [result, action, pending] = useActionState<UploadResult | null, FormData>(uploadFile, null);
  const [file, setFile] = useState<File | null>(null);

  return (
    <div className="space-y-5">
      <form action={action} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700">Dapur</span>
          <select name="kitchenId" defaultValue={kitchenId} required className={field}>
            {kitchens.map((k) => (
              <option key={k.id} value={k.id}>
                {k.code ? `${k.code} · ${k.name}` : k.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700">Jenis data</span>
          <select name="domain" required className={field}>
            {DOMAINS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700">Periode (opsional)</span>
          <input type="month" name="period" className={field} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700">File (.xlsx, maks. 10 MB)</span>
          <input type="file" name="file" accept=".xlsx" required onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium" />
        </label>

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm sm:col-span-2">
          <dt className="text-slate-500">File dipilih</dt>
          <dd className="text-slate-800">{file ? `${file.name} (${formatSize(file.size)})` : "—"}</dd>
          <dt className="text-slate-500">Profil terdeteksi</dt>
          {/* diisi di SCRUM-39: mapping profile detection. */}
          <dd className="text-slate-500">Belum terdeteksi</dd>
        </dl>

        <div className="sm:col-span-2">
          <button type="submit" disabled={pending} className="h-10 rounded-lg bg-emerald-700 px-4 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60">
            {pending ? "Mengunggah…" : "Unggah"}
          </button>
        </div>
      </form>

      {result && !result.ok && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {result.message}
        </p>
      )}

      {result?.ok && (
        <section aria-live="polite" className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 text-sm">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={result.status} />
            <span className="font-mono text-xs text-slate-500">Batch {result.batchId}</span>
            <span className="text-slate-600">{result.rowCount} baris</span>
          </div>
          {result.warning && <p className="rounded-md bg-amber-50 p-3 text-amber-800">{result.warning}</p>}
          {result.errorSummary && <p className="text-slate-700">{result.errorSummary}</p>}
          {result.sheets.length > 0 && (
            <ul className="list-inside list-disc text-slate-600">
              {result.sheets.map((s) => (
                <li key={s.name}>
                  Sheet <span className="font-medium">{s.name}</span>: {s.headerRow ? `header baris ${s.headerRow}, ${s.rowCount} baris data` : "header tidak ditemukan"}
                </li>
              ))}
            </ul>
          )}
          <p className="flex gap-4">
            <Link href="/mapping-validasi" className="font-medium text-emerald-700 hover:underline">
              Ke Mapping &amp; Validasi
            </Link>
          </p>
        </section>
      )}
    </div>
  );
}
