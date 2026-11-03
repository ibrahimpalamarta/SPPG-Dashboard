"use client";

import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { submitManualEntry, type UploadResult } from "./actions";
import { useT } from "@/components/i18n-provider";
import { Card } from "@/components/ui/card";
import { Field, FormMessage, field, primaryButton, secondaryButton } from "@/components/ui/form";
import type { Kitchen } from "@/lib/me";

const TYPES = [
  { value: "BELANJA", label: "Belanja" },
  { value: "PENGGAJIAN", label: "Penggajian" },
  { value: "INSENTIF", label: "Insentif" },
  { value: "PENERIMAAN", label: "Penerimaan" },
];

/** SCRUM-75/108: a single Cashflow transaction typed in by hand, for when there is no file. */
export function ManualEntryForm({ kitchens }: { kitchens: Kitchen[] }) {
  const t = useT();
  const [result, action, pending] = useActionState<UploadResult | null, FormData>(submitManualEntry, null);
  const [lines, setLines] = useState([0]);
  const [next, setNext] = useState(1);
  // `key` remounts the inputs for a new entry, so a saved one is not sent twice by accident.
  const [entry, setEntry] = useState(0);

  return (
    <details>
      <summary className="cursor-pointer text-sm font-medium text-emerald-700">{t("Tidak punya file? Isi satu transaksi secara manual")}</summary>
      <Card className="mt-3 p-6">
        <form key={entry} action={action} className="space-y-4">
          <p className="text-sm text-slate-500">{t("Entri manual hanya cadangan. Isinya dicek dan dipublish seperti file unggahan, dan tidak menimpa data yang sudah ada.")}</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t("Dapur")}>
              <select name="kitchenId" className={field} defaultValue={kitchens[0]?.id}>
                {kitchens.map((k) => (
                  <option key={k.id} value={k.id}>{k.code ? `${k.code} · ${k.name}` : k.name}</option>
                ))}
              </select>
            </Field>
            <Field label={t("Tanggal")}>
              <input name="date" type="date" required className={field} />
            </Field>
            <Field label={t("Jenis")}>
              <select name="type" className={field} defaultValue="BELANJA">
                {TYPES.map((o) => (
                  <option key={o.value} value={o.value}>{t(o.label)}</option>
                ))}
              </select>
            </Field>
            <Field label={t("Kategori")}>
              <input name="category" required className={field} />
            </Field>
            <Field label={t("Uraian")}>
              <input name="description" required className={field} />
            </Field>
            <Field label={t("Penerima")}>
              <input name="counterparty" required className={field} />
            </Field>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">{t("Barang")}</p>
            {lines.map((id) => (
              <div key={id} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] items-center gap-2">
                <input name="item" aria-label={t("Nama barang")} placeholder={t("Nama barang")} className={field} />
                <input name="qty" type="number" min="0" step="any" aria-label={t("Jumlah")} placeholder={t("Jumlah")} className={field} />
                <input name="unit" aria-label={t("Satuan")} placeholder={t("Satuan")} className={field} />
                <input name="price" type="number" min="0" step="any" aria-label={t("Harga satuan")} placeholder={t("Harga satuan")} className={field} />
                <button type="button" disabled={lines.length === 1} onClick={() => setLines(lines.filter((l) => l !== id))} aria-label={t("Hapus barang")} className="inline-flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40">
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => { setLines([...lines, next]); setNext(next + 1); }} className={`${secondaryButton} inline-flex items-center gap-1`}>
              <Plus className="size-4" aria-hidden="true" />
              {t("Tambah barang")}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={pending} className={primaryButton}>{pending ? t("Mengirim...") : t("Simpan entri")}</button>
            {result && !result.ok && <FormMessage>{result.message}</FormMessage>}
            {result?.ok && (
              <FormMessage tone="ok">
                {result.autoPublished ? t("Entri dipublish.") : t("Entri disimpan, perlu dicek dulu.")}{" "}
                <Link href="/mapping-validasi" className="underline">{t("Lihat di Upload History")}</Link>{" "}
                <button type="button" onClick={() => { setEntry(entry + 1); setLines([0]); }} className="underline">{t("Isi entri lain")}</button>
              </FormMessage>
            )}
          </div>
        </form>
      </Card>
    </details>
  );
}
