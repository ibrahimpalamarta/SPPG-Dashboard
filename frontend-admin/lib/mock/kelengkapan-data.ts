// ponytail: static mockup data until the completeness API exists; replace with a fetch then.
import { BookOpen, Building2, CircleCheck, CircleX, Coins, FileText, Gauge, Package, UserRound, Utensils, Wallet, WalletCards, type LucideIcon } from "lucide-react";
import type { Tone } from "@/components/ui/badge";

type Status = { label: string; tone: Tone };

type Stat = { icon: LucideIcon; label: string; value: string; valueClass?: string };
type MatrixRow = { code: string; name: string; note: string; cells: Status[]; phase?: string };
type DetailRow = { icon: LucideIcon; type: string; status: Status; issue?: Status; approvedAt?: string; action?: "Ingatkan" | "Buka" };

const s = (label: string, tone: Tone): Status => ({ label, tone });

const entered = s("Sudah masuk", "green");
const sent = s("Sudah dikirim", "blue");
const checking = s("Belum selesai dicek", "violet");
const draft = s("Masuk · draft", "amber");
const missing = s("Belum masuk", "pending");
const failed = s("Ada error", "red");
const optional = s("Opsional", "slate");
const ready = s("Siap dipublish", "blue");

export const stats: Stat[] = [
  { icon: Building2, label: "Kitchen terhubung", value: "2 / 6" },
  { icon: Gauge, label: "Kelengkapan SKN", value: "33%" },
  { icon: CircleX, label: "Wajib diperbaiki", value: "1", valueClass: "text-red-500" },
  { icon: CircleCheck, label: "Publish terakhir", value: "08 Nov · Pembayaran Sukun" },
];

export const legend: Status[] = [entered, s("Error", "red"), s("Belum ada", "slate")];

export const columns = ["Cashflow", "RAB", "Purchase Order", "Pembayaran Supplier", "Jumlah Penerima Manfaat", "Saldo Rekening", "Master Menu *", "Penerimaan Barang *"];

export const matrix: MatrixRow[] = [
  { code: "SKN", name: "Sukun", note: "Pilot Phase 1", cells: [missing, ready, checking, entered, missing, draft, entered, optional] },
  { code: "LWG", name: "Lawang", note: "Pembanding Phase 1", cells: [failed, s("Tidak ada file", "pending"), sent, s("Belum dipakai", "slate"), sent, draft, entered, optional] },
  { code: "DNM", name: "Donomulyo", note: "Rollout", cells: [], phase: "Phase 2" },
  { code: "PCK", name: "Poncokusumo", note: "Rollout", cells: [], phase: "Phase 2" },
  { code: "SML", name: "Kahean", note: "Readiness", cells: [], phase: "Phase 2b" },
  { code: "TRN", name: "Turen", note: "Rollout", cells: [], phase: "Phase 2" },
];

const icons: LucideIcon[] = [Wallet, Utensils, FileText, Coins, UserRound, WalletCards, BookOpen, Package];
const approvedAt: Record<string, Record<string, string>> = {
  SKN: { Cashflow: "03 Nov 2026 16:48", "Pembayaran Supplier": "08 Nov 2026 11:40", "Saldo Rekening": "05 Nov 2026 10:10", "Master Menu": "06 Nov 2026 15:02" },
};
const issues: Record<string, Record<string, Status>> = { SKN: { "Purchase Order": s("2 perlu dicek", "amber") } };

/** Per-jenis-data detail of one dapur, derived from its matrix row; null for Phase 2 dapur and unknown codes. */
export function detailFor(code: string | null): { name: string; rows: DetailRow[] } | null {
  const row = matrix.find((m) => m.code === code);
  if (!row || row.phase) return null;
  return {
    name: row.name,
    rows: row.cells.map((status, i) => {
      const type = columns[i].replace(" *", "");
      return {
        icon: icons[i],
        type,
        status,
        issue: issues[row.code]?.[type],
        approvedAt: approvedAt[row.code]?.[type],
        action: status === missing ? "Ingatkan" : status === ready || status === checking ? "Buka" : undefined,
      };
    }),
  };
}
