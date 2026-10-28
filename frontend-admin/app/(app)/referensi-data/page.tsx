import { ArrowRight, Eye, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SampleDataNote } from "@/components/ui/sample-data-note";
import { SourceLink } from "@/components/ui/source-link";
import { apiGet } from "@/lib/api";
import { requirePage } from "@/lib/guard";
import {
  alurLangkah,
  aturanCek,
  asalAngka,
  daftarKode,
  formatFile,
  kamusData,
  keputusan,
  TABS,
  type TabId,
} from "@/lib/mock/referensi-data";
import { KitchenForm } from "./kitchen-form";

export const metadata: Metadata = { title: "Data Reference · SPPG Internal" };

type KitchenRow = {
  id: string;
  code: string | null;
  name: string;
  status: "ACTIVE" | "INACTIVE";
  bucket: 1 | 2 | null;
  rolloutStatus: "PILOT_PHASE_1" | "PHASE_1_COMPARISON" | "PHASE_2A" | "PHASE_2B" | null;
};

// PRD §14 stage names.
const ROLLOUT_LABELS: Record<NonNullable<KitchenRow["rolloutStatus"]>, string> = {
  PILOT_PHASE_1: "Pilot Phase 1",
  PHASE_1_COMPARISON: "Pembanding Phase 1",
  PHASE_2A: "Phase 2a",
  PHASE_2B: "Phase 2b",
};

const MISSING = <span className="text-slate-400">Belum ditetapkan</span>;

const th = "px-4 py-3 font-medium";
const td = "px-4 py-3";

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs text-slate-500">
          <tr>
            {head.map((h) => (
              <th key={h} className={th}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-700">{children}</tbody>
      </table>
    </div>
  );
}

function Kamus({ q }: { q: string }) {
  const rows = kamusData.filter((r) => r[0].toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-4">
      <form className="relative max-w-sm">
        <input type="hidden" name="tab" value="kamus" />
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          name="q"
          defaultValue={q}
          placeholder="Cari nama data..."
          aria-label="Cari nama data"
          className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm"
        />
      </form>
      <Table head={["Nama data", "Artinya", "Contoh", "Wajib", "Aturan", "Kerahasiaan"]}>
        {rows.map(([nama, arti, contoh, wajib, aturan, rahasia]) => (
          <tr key={nama}>
            <td className={`${td} font-semibold text-slate-900`}>{nama}</td>
            <td className={td}>{arti}</td>
            <td className={td}>{contoh}</td>
            <td className={td}>{wajib}</td>
            <td className={td}>{aturan}</td>
            <td className={td}>
              <Badge tone={rahasia === "Rahasia" ? "red" : "slate"}>{rahasia}</Badge>
            </td>
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <td colSpan={6} className={`${td} text-center text-slate-500`}>
              Tidak ada data yang cocok.
            </td>
          </tr>
        )}
      </Table>
    </div>
  );
}

function Format() {
  return (
    <Table head={["Format file", "Dapur", "Jenis data", "Contoh nama file", "Status", "Berlaku mulai"]}>
      {formatFile.map(([nama, dapur, jenis, contoh, [label, tone], mulai]) => (
        <tr key={`${nama}-${dapur}`}>
          <td className={`${td} font-semibold text-slate-900`}>{nama}</td>
          <td className={td}>{dapur}</td>
          <td className={td}>{jenis}</td>
          <td className={td}>{contoh}</td>
          <td className={td}>
            <Badge tone={tone}>{label}</Badge>
          </td>
          <td className={td}>{mulai}</td>
        </tr>
      ))}
    </Table>
  );
}

function Alur() {
  return (
    <div className="space-y-6">
      <ol className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-4">
        {alurLangkah.map((judul, i) => (
          <li key={judul} className="flex items-center gap-3">
            <div className="rounded-lg border border-slate-200 px-4 py-2">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Langkah {i + 1}</p>
              <p className="font-semibold text-slate-900">{judul}</p>
            </div>
            {i < alurLangkah.length - 1 && <ArrowRight className="size-4 text-slate-400" aria-hidden="true" />}
          </li>
        ))}
      </ol>
      <h2 className="text-lg font-bold text-slate-900">Asal setiap angka</h2>
      <Table head={["Angka", "Diambil dari", ""]}>
        {asalAngka.map(([angka, dari]) => (
          <tr key={angka}>
            <td className={`${td} font-semibold text-slate-900`}>{angka}</td>
            <td className={td}>{dari}</td>
            <td className={`${td} text-right`}>
              <SourceLink />
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

function Aturan() {
  return (
    <Table head={["Yang dicek", "Aturan", "Tingkat", "Jika tidak sesuai"]}>
      {aturanCek.map(([cek, aturan, [label, tone], akibat]) => (
        <tr key={cek}>
          <td className={`${td} font-semibold text-slate-900`}>{cek}</td>
          <td className={td}>{aturan}</td>
          <td className={td}>
            <Badge tone={tone}>{label}</Badge>
          </td>
          <td className={td}>{akibat}</td>
        </tr>
      ))}
    </Table>
  );
}

async function Kode({ canEdit }: { canEdit: boolean }) {
  // Six dapur at launch; one page of 100 is the whole master.
  const { data } = await apiGet<{ data: KitchenRow[] }>("/kitchens?pageSize=100");
  return (
    <div className="space-y-6">
      <Table head={["Daftar", "Pilihan", "Catatan"]}>
        {daftarKode.map(([daftar, pilihan, catatan]) => (
          <tr key={daftar}>
            <td className={`${td} font-semibold text-slate-900`}>{daftar}</td>
            <td className={td}>{pilihan.join(" · ")}</td>
            <td className={td}>{catatan}</td>
          </tr>
        ))}
      </Table>

      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">Master dapur</h2>
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Kode</th>
              <th className="px-4 py-2 font-medium">Nama</th>
              <th className="px-4 py-2 font-medium">Bucket</th>
              <th className="px-4 py-2 font-medium">Tahap rollout</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          {data.map((k) => (
            <tbody key={k.id} className="border-t border-slate-100 text-slate-700">
              <tr className="hover:bg-slate-50">
                <td className="px-4 py-2 font-mono">{k.code ?? MISSING}</td>
                <td className="px-4 py-2">{k.name}</td>
                <td className="px-4 py-2">{k.bucket ?? MISSING}</td>
                <td className="px-4 py-2">{k.rolloutStatus ? ROLLOUT_LABELS[k.rolloutStatus] : MISSING}</td>
                <td className="px-4 py-2">{k.status === "ACTIVE" ? "Aktif" : "Nonaktif"}</td>
              </tr>
              {canEdit && (
                <tr>
                  <td colSpan={5} className="px-4 pb-3">
                    <details>
                      <summary className="cursor-pointer text-xs font-medium text-emerald-700">Ubah</summary>
                      <div className="mt-3">
                        <KitchenForm id={k.id} name={k.name} status={k.status} />
                      </div>
                    </details>
                  </td>
                </tr>
              )}
            </tbody>
          ))}
        </table>
      </section>
    </div>
  );
}

function Keputusan() {
  return (
    <Table head={["Kode", "Yang perlu diputuskan", "Penanggung jawab", "Yang tertunda", "Status"]}>
      {keputusan.map(([kode, apa, pj, tertunda, selesai]) => (
        <tr key={kode}>
          <td className={`${td} font-mono text-xs`}>{kode}</td>
          <td className={td}>{apa}</td>
          <td className={td}>{pj}</td>
          <td className={td}>{tertunda}</td>
          <td className={td}>
            <Badge tone={selesai ? "green" : "amber"}>{selesai ? "Sudah diputuskan" : "Belum diputuskan"}</Badge>
          </td>
        </tr>
      ))}
    </Table>
  );
}

export default async function Page({ searchParams }: PageProps<"/referensi-data">) {
  const me = await requirePage("/referensi-data");
  // SCRUM-123: everyone may read Data Reference; only PM MBG (reference:edit) changes it.
  const canEdit = me.permissions.includes("reference:edit");
  const { tab: rawTab, q: rawQ } = await searchParams;
  const tab: TabId = TABS.find((t) => t.id === rawTab)?.id ?? "kamus";
  const q = typeof rawQ === "string" ? rawQ : "";

  return (
    <div className="mx-auto max-w-400">
      <SampleDataNote />
      <Card className="space-y-6 p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Data Reference</h1>
            <p className="mt-2 text-slate-600">Buku panduan data: arti tiap data, format file yang dikenali, dan aturan pengecekan.</p>
          </div>
          {!canEdit && (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              <Eye className="size-3.5" aria-hidden="true" />
              Hanya lihat
            </span>
          )}
        </div>

        <nav aria-label="Bagian Data Reference" className="flex flex-wrap gap-x-6 border-b border-slate-200">
          {TABS.map((t) => (
            <Link
              key={t.id}
              href={`?tab=${t.id}`}
              aria-current={t.id === tab ? "page" : undefined}
              className={`-mb-px border-b-2 pb-3 text-sm font-medium ${t.id === tab ? "border-emerald-700 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"}`}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        {tab === "kamus" && <Kamus q={q} />}
        {tab === "format" && <Format />}
        {tab === "alur" && <Alur />}
        {tab === "aturan" && <Aturan />}
        {tab === "kode" && <Kode canEdit={canEdit} />}
        {tab === "keputusan" && <Keputusan />}
      </Card>
    </div>
  );
}
