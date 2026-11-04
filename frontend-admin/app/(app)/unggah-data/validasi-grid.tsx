"use client";

import { Check, Plus, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import type { CheckResult, RawCell } from "./actions";
import { useT } from "@/components/i18n-provider";
import { Badge } from "@/components/ui/badge";

const primaryButton = "inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-medium text-white hover:bg-emerald-800 disabled:bg-slate-100 disabled:text-slate-400";
const secondaryButton = "inline-flex h-10 items-center gap-2 rounded-lg border border-emerald-700 px-4 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-60";
const PAGE_SIZE = 50;

/** A cell as the uploader would type it back: dates dd/mm/yyyy, decimals with a comma — the forms the backend parses. */
function text(cell: RawCell | undefined): string {
  if (!cell || cell.value === null) return "";
  if (cell.type === "date") {
    const [y, m, d] = String(cell.value).slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
  }
  if (typeof cell.value === "number") return String(cell.value).replace(".", ",");
  return String(cell.value);
}

/** `row` is null for a row the uploader added. */
type GridRow = { key: string; id: string | null; sheet: string; row: number | null; cells: Record<string, string>; orig: Record<string, string> };

/**
 * "Validasi Data": the file's rows as an editable table. Edits stay here until Publish sends them
 * with the file (`rowEdits`); the backend parses the file with them applied and checks it again.
 */
export function ValidasiGrid({ check, fileName, busy, onBack }: { check: Extract<CheckResult, { ok: true }>; fileName: string; busy: boolean; onBack: () => void }) {
  const t = useT();
  const sheets = check.sheets.filter((s) => s.headerRow !== null && !s.skipped && check.rows.some((r) => r.sheet === s.name));
  const [sheet, setSheet] = useState(sheets[0]?.name ?? "");
  const [rows, setRows] = useState<GridRow[]>(() =>
    check.rows.map((r) => {
      const cells = Object.fromEntries(Object.entries(r.cells).map(([c, v]) => [c, text(v)]));
      return { key: r.id, id: r.id, sheet: r.sheet, row: r.row, cells, orig: cells };
    }),
  );
  const [removed, setRemoved] = useState<GridRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [current, setCurrent] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const headers = Object.entries(check.sheets.find((s) => s.name === sheet)?.headers ?? {}).filter(([, h]) => h.trim() !== "");
  const shown = rows.filter((r) => r.sheet === sheet);
  const totalPages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const visible = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const flagsOf = (r: GridRow) => (r.id ? (check.flags[r.id] ?? []) : []);
  // Flagged rows still to check before Publish; a removed row needs none.
  const open = rows.filter((r) => flagsOf(r).length > 0 && !checked.has(r.key));
  const flagged = rows.filter((r) => flagsOf(r).length > 0).length;
  const focus = rows.find((r) => r.key === current);

  const rowEdits = {
    update: rows.filter((r) => r.row !== null).flatMap((r) => {
      const cells = Object.fromEntries(Object.entries(r.cells).filter(([c, v]) => v !== (r.orig[c] ?? "")));
      return Object.keys(cells).length ? [{ sheet: r.sheet, row: r.row!, cells }] : [];
    }),
    remove: removed.filter((r) => r.row !== null).map((r) => ({ sheet: r.sheet, row: r.row! })),
    add: rows.filter((r) => r.row === null).map((r) => ({ sheet: r.sheet, cells: Object.fromEntries(Object.entries(r.cells).filter(([, v]) => v.trim() !== "")) })),
  };
  const edited = rowEdits.update.length + rowEdits.remove.length + rowEdits.add.length > 0;

  /** Opens the row's page, then scrolls it into view once rendered. */
  const goTo = (r: GridRow | undefined) => {
    setCurrent(r?.key ?? null);
    if (!r) return;
    setSheet(r.sheet);
    setPage(Math.floor(rows.filter((x) => x.sheet === r.sheet).indexOf(r) / PAGE_SIZE) + 1);
    requestAnimationFrame(() => document.getElementById(`row-${r.key}`)?.scrollIntoView({ block: "center", behavior: "smooth" }));
  };
  const markChecked = () => {
    if (!focus) return;
    const next = new Set(checked).add(focus.key);
    setChecked(next);
    goTo(rows.find((r) => flagsOf(r).length > 0 && !next.has(r.key)));
  };
  const edit = (key: string, column: string, value: string) => setRows((all) => all.map((r) => (r.key === key ? { ...r, cells: { ...r.cells, [column]: value } } : r)));
  const add = () => {
    const key = `new-${crypto.randomUUID()}`;
    setRows((all) => [...all, { key, id: null, sheet, row: null, cells: {}, orig: {} }]);
    setPage(Math.ceil((shown.length + 1) / PAGE_SIZE));
    requestAnimationFrame(() => document.getElementById(`row-${key}`)?.scrollIntoView({ block: "center", behavior: "smooth" }));
  };
  const removeSelected = () => {
    setRemoved((r) => [...r, ...rows.filter((x) => selected.has(x.key))]);
    setRows((all) => all.filter((r) => !selected.has(r.key)));
    if (current && selected.has(current)) setCurrent(null);
    setSelected(new Set());
    setPage(1);
  };
  const pageKeys = visible.map((r) => r.key);
  const allSelected = pageKeys.length > 0 && pageKeys.every((k) => selected.has(k));

  return (
    <section className="space-y-6">
      <input type="hidden" name="rowEdits" value={edited ? JSON.stringify(rowEdits) : ""} />
      <input type="hidden" name="publish" value="1" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">{t("Validasi Data")}</h2>
        <button type="button" onClick={onBack} className={secondaryButton}>
          {t("Kembali")}
        </button>
      </div>

      <div className="rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
          <p className="flex min-w-0 items-center gap-2 text-slate-500">
            {t("Tabel")}: <span className="truncate font-semibold text-slate-900">{fileName}</span>
            <Badge tone="slate">{t("Draft")}</Badge>
          </p>
          <div className="flex flex-wrap gap-3">
            {selected.size > 0 && (
              <button type="button" onClick={removeSelected} className="inline-flex h-10 items-center gap-2 rounded-lg border border-red-300 px-4 text-sm font-medium text-red-700 hover:bg-red-50">
                <Trash2 className="size-4" aria-hidden="true" />
                {t("Hapus {count} baris", { count: selected.size })}
              </button>
            )}
            <button type="button" onClick={add} className={secondaryButton}>
              <Plus className="size-4" aria-hidden="true" />
              {t("Tambah data")}
            </button>
            <button type="submit" disabled={busy || open.length > 0} className={primaryButton}>
              {t("Publish")}
            </button>
          </div>
        </div>

        <div className="p-4">
          <div aria-live="polite" className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-100 p-4 text-sm text-slate-800">
            <p className="flex items-start gap-2">
              {open.length ? <Sparkles className="mt-0.5 size-4 shrink-0 text-sky-600" aria-hidden="true" /> : <Check className="mt-0.5 size-4 shrink-0 text-emerald-700" aria-hidden="true" />}
              <span>
                {focus ? (
                  <>
                    <strong>{t("Baris {row}", { row: focus.row ?? "" })}:</strong> {flagsOf(focus).map((f) => f.message).join(" ")}
                  </>
                ) : open.length ? (
                  t("AI menandai {count} data yang perlu dicek. Cek satu per satu sebelum Publish.", { count: open.length })
                ) : flagged ? (
                  t("Semua data yang ditandai sudah dicek. Data siap di-Publish.")
                ) : (
                  t("AI tidak menemukan data yang perlu dicek. Data siap di-Publish.")
                )}
              </span>
            </p>
            {focus ? (
              <button type="button" onClick={markChecked} className="inline-flex h-9 items-center gap-2 rounded-lg bg-sky-700 px-4 font-medium text-white hover:bg-sky-800">
                <Check className="size-4" aria-hidden="true" />
                {t("Sudah dicek")}
              </button>
            ) : (
              open.length > 0 && (
                <button type="button" onClick={() => goTo(open[0])} className="inline-flex h-9 items-center rounded-lg bg-sky-700 px-4 font-medium text-white hover:bg-sky-800">
                  {t("Cek data")}
                </button>
              )
            )}
          </div>
        </div>

        {sheets.length > 1 && (
          <div role="tablist" className="flex gap-2 px-4 pb-3">
            {sheets.map((s) => (
              <button
                key={s.name}
                type="button"
                role="tab"
                aria-selected={s.name === sheet}
                onClick={() => {
                  setSheet(s.name);
                  setPage(1);
                }}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${s.name === sheet ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}

        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-slate-700">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label={t("Pilih semua baris di halaman ini")}
                    checked={allSelected}
                    onChange={() => setSelected((s) => new Set(allSelected ? [...s].filter((k) => !pageKeys.includes(k)) : [...s, ...pageKeys]))}
                    className="size-4"
                  />
                </th>
                <th className="px-2 py-3 text-right font-medium text-slate-500">{t("No")}</th>
                {headers.map(([column, header]) => (
                  <th key={column} className="whitespace-nowrap px-2 py-3 font-semibold">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((r, i) => {
                const flags = flagsOf(r);
                const warn = flags.length > 0 && !checked.has(r.key);
                return (
                  <tr key={r.key} id={`row-${r.key}`} className={r.key === current ? "bg-sky-50 outline-2 -outline-offset-2 outline-sky-600" : warn ? "bg-amber-50/60" : ""}>
                    <td className="px-4 py-1.5">
                      <input
                        type="checkbox"
                        aria-label={t("Pilih baris {row}", { row: (page - 1) * PAGE_SIZE + i + 1 })}
                        checked={selected.has(r.key)}
                        onChange={() =>
                          setSelected((s) => {
                            const next = new Set(s);
                            if (!next.delete(r.key)) next.add(r.key);
                            return next;
                          })
                        }
                        className="size-4"
                      />
                    </td>
                    <td className="px-2 py-1.5 text-right text-slate-500" title={flags.map((f) => `${t(f.label)}: ${f.message}`).join("\n") || undefined}>
                      {(page - 1) * PAGE_SIZE + i + 1}
                    </td>
                    {headers.map(([column, header]) => {
                      const value = r.cells[column] ?? "";
                      const changed = value !== (r.orig[column] ?? "");
                      return (
                        <td key={column} className="px-1 py-1">
                          <input
                            value={value}
                            onChange={(e) => edit(r.key, column, e.target.value)}
                            // Enter in a cell would submit the form, i.e. Publish.
                            onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                            aria-label={`${header}, ${t("baris")} ${(page - 1) * PAGE_SIZE + i + 1}`}
                            className={`h-9 w-full min-w-24 rounded-md border px-2 text-slate-800 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 ${
                              changed ? "border-emerald-300 bg-emerald-50" : warn ? "border-amber-200 bg-amber-50" : "border-transparent bg-transparent hover:border-slate-200"
                            }`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-500">
          <span>
            {t("{count} baris", { count: shown.length })}
            {check.rowCount > check.rows.length && ` · ${t("menampilkan {shown} baris pertama dari {total}", { shown: check.rows.length, total: check.rowCount })}`}
          </span>
          {totalPages > 1 && (
            <span className="flex items-center gap-3">
              <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)} className="font-medium text-slate-700 disabled:opacity-40">
                {t("Sebelumnya")}
              </button>
              {page} / {totalPages}
              <button type="button" disabled={page === totalPages} onClick={() => setPage(page + 1)} className="font-medium text-slate-700 disabled:opacity-40">
                {t("Berikutnya")}
              </button>
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
