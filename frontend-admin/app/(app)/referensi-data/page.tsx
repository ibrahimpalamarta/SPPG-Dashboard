import { ArrowRight, Eye, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SampleDataNote } from "@/components/ui/sample-data-note";
import { SourceLink } from "@/components/ui/source-link";
import { apiGet } from "@/lib/api";
import { requirePage } from "@/lib/guard";
import { getT } from "@/lib/lang-server";
import type { AturanFields, KamusFields, KodeFields, ReferenceEntry } from "@/lib/reference-entries";
import { alurLangkah, asalAngka, formatFile, TABS, type TabId } from "@/lib/mock/referensi-data";
import { EditEntryButton } from "./edit-entry-button";

export async function generateMetadata(): Promise<Metadata> {
  return { title: `${(await getT())("Data Reference")} · SPPG Internal` };
}

const th = "px-4 py-3 font-medium";
const td = "px-4 py-3";

async function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  const t = await getT();
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs text-slate-500">
          <tr>
            {head.map((h) => (
              <th key={h} className={th}>
                {t(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-700">{children}</tbody>
      </table>
    </div>
  );
}

async function Kamus({ q, canEdit }: { q: string; canEdit: boolean }) {
  const t = await getT();
  const { data } = await apiGet<{ data: ReferenceEntry<KamusFields>[] }>("/reference-entries?kind=KAMUS");
  const rows = data.filter((r) => r.fields.nama.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-4">
      <form className="relative max-w-sm">
        <input type="hidden" name="tab" value="kamus" />
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          name="q"
          defaultValue={q}
          placeholder={t("Cari nama data...")}
          aria-label={t("Cari nama data")}
          className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm"
        />
      </form>
      <Table head={["Nama data", "Artinya", "Contoh", "Wajib", "Aturan", "Kerahasiaan", ...(canEdit ? [""] : [])]}>
        {rows.map((r) => (
          <tr key={r.id}>
            <td className={`${td} font-semibold text-slate-900`}>{r.fields.nama}</td>
            <td className={td}>{r.fields.artinya}</td>
            <td className={td}>{r.fields.contoh}</td>
            <td className={td}>{r.fields.wajib}</td>
            <td className={td}>{r.fields.aturan}</td>
            <td className={td}>
              <Badge tone={r.fields.kerahasiaan === "Rahasia" ? "red" : "slate"}>{t(r.fields.kerahasiaan)}</Badge>
            </td>
            {canEdit && (
              <td className={td}>
                <EditEntryButton
                  id={r.id}
                  title={r.fields.nama}
                  inputs={[
                    { name: "artinya", label: t("Artinya"), defaultValue: r.fields.artinya, multiline: true },
                    { name: "contoh", label: t("Contoh"), defaultValue: r.fields.contoh },
                    { name: "aturan", label: t("Aturan"), defaultValue: r.fields.aturan, multiline: true },
                  ]}
                />
              </td>
            )}
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <td colSpan={canEdit ? 7 : 6} className={`${td} text-center text-slate-500`}>
              {t("Tidak ada data yang cocok.")}
            </td>
          </tr>
        )}
      </Table>
    </div>
  );
}

async function Format() {
  const t = await getT();
  return (
    <Table head={["Format file", "Dapur", "Jenis data", "Contoh nama file", "Status", "Berlaku mulai"]}>
      {formatFile.map(([nama, dapur, jenis, contoh, [label, tone], mulai]) => (
        <tr key={`${nama}-${dapur}`}>
          <td className={`${td} font-semibold text-slate-900`}>{nama}</td>
          <td className={td}>{dapur}</td>
          <td className={td}>{t(jenis)}</td>
          <td className={td}>{contoh}</td>
          <td className={td}>
            <Badge tone={tone}>{t(label)}</Badge>
          </td>
          <td className={td}>{mulai}</td>
        </tr>
      ))}
    </Table>
  );
}

async function Alur() {
  const t = await getT();
  return (
    <div className="space-y-6">
      <ol className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-4">
        {alurLangkah.map((judul, i) => (
          <li key={judul} className="flex items-center gap-3">
            <div className="rounded-lg border border-slate-200 px-4 py-2">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("Langkah")} {i + 1}</p>
              <p className="font-semibold text-slate-900">{t(judul)}</p>
            </div>
            {i < alurLangkah.length - 1 && <ArrowRight className="size-4 text-slate-400" aria-hidden="true" />}
          </li>
        ))}
      </ol>
      <h2 className="text-lg font-bold text-slate-900">{t("Asal setiap angka")}</h2>
      <Table head={["Angka", "Diambil dari", ""]}>
        {asalAngka.map(([angka, dari]) => (
          <tr key={angka}>
            <td className={`${td} font-semibold text-slate-900`}>{t(angka)}</td>
            <td className={td}>{t(dari)}</td>
            <td className={`${td} text-right`}>
              <SourceLink />
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

async function Aturan({ canEdit }: { canEdit: boolean }) {
  const t = await getT();
  const { data } = await apiGet<{ data: ReferenceEntry<AturanFields>[] }>("/reference-entries?kind=ATURAN");
  return (
    <Table head={["Yang dicek", "Aturan", "Tingkat", "Jika tidak sesuai", ...(canEdit ? [""] : [])]}>
      {data.map((r) => (
        <tr key={r.id}>
          <td className={`${td} font-semibold text-slate-900`}>{r.fields.cek}</td>
          <td className={td}>{r.fields.aturan}</td>
          <td className={td}>
            <Badge tone={r.fields.tingkatTone}>{t(r.fields.tingkat)}</Badge>
          </td>
          <td className={td}>{r.fields.akibat}</td>
          {canEdit && (
            <td className={td}>
              <EditEntryButton
                id={r.id}
                title={r.fields.cek}
                inputs={[
                  { name: "aturan", label: t("Aturan"), defaultValue: r.fields.aturan, multiline: true },
                  { name: "akibat", label: t("Jika tidak sesuai"), defaultValue: r.fields.akibat },
                ]}
              />
            </td>
          )}
        </tr>
      ))}
    </Table>
  );
}

async function Kode({ canEdit }: { canEdit: boolean }) {
  const t = await getT();
  const { data } = await apiGet<{ data: ReferenceEntry<KodeFields>[] }>("/reference-entries?kind=KODE");
  return (
    <Table head={["Daftar", "Pilihan", "Catatan", ...(canEdit ? [""] : [])]}>
      {data.map((r) => (
        <tr key={r.id}>
          <td className={`${td} font-semibold text-slate-900`}>{r.fields.daftar}</td>
          <td className={td}>{r.fields.pilihan.join(" · ")}</td>
          <td className={td}>{r.fields.catatan}</td>
          {canEdit && (
            <td className={td}>
              <EditEntryButton
                id={r.id}
                title={r.fields.daftar}
                inputs={[{ name: "catatan", label: t("Catatan"), defaultValue: r.fields.catatan }]}
                list={{ name: "pilihan", label: t("Pilihan (satu per baris)"), defaultValue: r.fields.pilihan }}
              />
            </td>
          )}
        </tr>
      ))}
    </Table>
  );
}

export default async function Page({ searchParams }: PageProps<"/referensi-data">) {
  const [me, t] = await Promise.all([requirePage("/referensi-data"), getT()]);
  // SCRUM-123: everyone may read Data Reference; only Admin (reference:edit) changes it.
  const canEdit = me.permissions.includes("reference:edit");
  const { tab: rawTab, q: rawQ } = await searchParams;
  const tab: TabId = TABS.find((x) => x.id === rawTab)?.id ?? "kamus";
  const q = typeof rawQ === "string" ? rawQ : "";

  return (
    <div className="mx-auto max-w-400">
      <SampleDataNote />
      <Card className="space-y-6 p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{t("Data Reference")}</h1>
          </div>
          {!canEdit && (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              <Eye className="size-3.5" aria-hidden="true" />
              {t("Hanya lihat")}
            </span>
          )}
        </div>

        <nav aria-label={t("Bagian Data Reference")} className="flex flex-wrap gap-x-6 border-b border-slate-200">
          {TABS.map((item) => (
            <Link
              key={item.id}
              href={`?tab=${item.id}`}
              aria-current={item.id === tab ? "page" : undefined}
              className={`-mb-px border-b-2 pb-3 text-sm font-medium ${item.id === tab ? "border-emerald-700 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"}`}
            >
              {t(item.label)}
            </Link>
          ))}
        </nav>

        {tab === "kamus" && <Kamus q={q} canEdit={canEdit} />}
        {tab === "format" && <Format />}
        {tab === "alur" && <Alur />}
        {tab === "aturan" && <Aturan canEdit={canEdit} />}
        {tab === "kode" && <Kode canEdit={canEdit} />}
      </Card>
    </div>
  );
}
