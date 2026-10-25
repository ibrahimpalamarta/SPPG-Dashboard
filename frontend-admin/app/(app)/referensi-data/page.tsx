import type { Metadata } from "next";
import { apiGet } from "@/lib/api";
import { requirePage } from "@/lib/guard";
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

// SCRUM-123: how a file becomes a dashboard number, in the user's words.
const DATA_FLOW = ["Unggah file", "Mapping kolom", "Validasi data", "Review PM", "Publish ke dashboard"];

const MISSING = <span className="text-slate-400">Belum ditetapkan</span>;

export default async function Page() {
  const me = await requirePage("/referensi-data");
  // SCRUM-123: everyone may read Data Reference; only PM MBG (reference:edit) changes it.
  const canEdit = me.permissions.includes("reference:edit");
  // Six dapur at launch; one page of 100 is the whole master.
  const { data } = await apiGet<{ data: KitchenRow[] }>("/kitchens?pageSize=100");

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <h1 className="text-lg font-semibold text-slate-800">Data Reference</h1>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-700">Alur Data</h2>
        <ol className="mt-3 grid gap-2 sm:grid-cols-5">
          {DATA_FLOW.map((step, i) => (
            <li key={step} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-xs font-semibold text-white">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </section>

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
              <tr>
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
