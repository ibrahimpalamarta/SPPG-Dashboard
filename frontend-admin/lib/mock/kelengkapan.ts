// ponytail: static mockup data until the completeness API exists; replace with a fetch then.
import type { Tone } from "@/components/ui/badge";

type Kitchen = {
  code: string;
  name: string;
  note: string;
  completeness?: number;
  phase?: string;
  issue?: { label: string; tone: Tone };
  lastPublish?: string;
};

export const skn = {
  complete: 2,
  sent: 4,
  items: [
    { label: "Cashflow", status: "Belum masuk", tone: "pending" },
    { label: "RAB", status: "Siap disetujui", tone: "blue" },
    { label: "Purchase Order", status: "Belum selesai dicek", tone: "violet" },
    { label: "Pembayaran Supplier", status: "Sudah masuk", tone: "green" },
    { label: "Jumlah Penerima Manfaat", status: "Belum masuk", tone: "pending" },
    { label: "Saldo Rekening", status: "Masuk · draft", tone: "amber" },
  ] satisfies { label: string; status: string; tone: Tone }[],
};

export const kitchens: Kitchen[] = [
  { code: "SKN", name: "Sukun", note: "Pilot Phase 1", completeness: 33, issue: { label: "2 perlu dicek", tone: "amber" }, lastPublish: "08 Nov · Pembayaran Supplier" },
  { code: "LWG", name: "Lawang", note: "Pembanding Phase 1", completeness: 17, issue: { label: "1 wajib diperbaiki", tone: "red" } },
  { code: "DNM", name: "Donomulyo", note: "Rollout Phase 2", phase: "Phase 2" },
  { code: "PCK", name: "Poncokusumo", note: "Rollout Phase 2", phase: "Phase 2" },
  { code: "SML", name: "Kahean", note: "Readiness Phase 2b", phase: "Phase 2b" },
  { code: "TRN", name: "Turen", note: "Rollout Phase 2", phase: "Phase 2" },
];
