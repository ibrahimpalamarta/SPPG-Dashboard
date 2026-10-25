import type { Metadata } from "next";
import { apiGet } from "@/lib/api";
import { requirePage } from "@/lib/guard";

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

export default async function Page() {
  await requirePage("/referensi-data");
  // Six dapur at launch; one page of 100 is the whole master.
  const { data } = await apiGet<{ data: KitchenRow[] }>("/kitchens?pageSize=100");

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <h1 className="text-lg font-semibold text-slate-800">Data Reference</h1>
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
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {data.map((k) => (
              <tr key={k.id}>
                <td className="px-4 py-2 font-mono">{k.code ?? MISSING}</td>
                <td className="px-4 py-2">{k.name}</td>
                <td className="px-4 py-2">{k.bucket ?? MISSING}</td>
                <td className="px-4 py-2">{k.rolloutStatus ? ROLLOUT_LABELS[k.rolloutStatus] : MISSING}</td>
                <td className="px-4 py-2">{k.status === "ACTIVE" ? "Aktif" : "Nonaktif"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
          Hanya baca. Tahap rollout mengikuti PRD §14 dan masih menunggu konfirmasi (posisi Lawang berbeda di BRD).
        </p>
      </section>
    </div>
  );
}
