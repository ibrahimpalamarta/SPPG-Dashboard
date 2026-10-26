// ponytail: static mockup data until the completeness API exists; replace with a fetch then.
import { BookOpen, Building2, CircleCheck, CircleX, Coins, FileText, Gauge, Package, Send, UserRound, Utensils, Wallet, WalletCards, type LucideIcon } from "lucide-react";
import type { Tone } from "@/components/ui/badge";

type Status = { label: string; tone: Tone };

type Stat = { icon: LucideIcon; label: string; value: string; valueClass?: string };
type MatrixRow = { code: string; name: string; note: string; cells: Status[]; active?: boolean; phase?: string };
type DetailRow = { icon: LucideIcon; type: string; status: Status; issue?: Status; approvedAt?: string; action?: "Ingatkan" | "Buka" };
type Delivery = { title: string; code: string; note: string; status: Status };

const s = (label: string, tone: Tone): Status => ({ label, tone });

const entered = s("Sudah masuk", "green");
const sent = s("Sudah dikirim", "blue");
const checking = s("Belum selesai dicek", "violet");
const draft = s("Masuk · draft", "amber");
const missing = s("Belum masuk", "pending");
const failed = s("Ada error", "red");
const optional = s("Opsional", "slate");
const ready = s("Siap disetujui", "blue");

export const stats: Stat[] = [
  { icon: Building2, label: "Kitchen terhubung", value: "2 / 6" },
  { icon: Gauge, label: "Kelengkapan SKN", value: "33%" },
  { icon: CircleX, label: "Wajib diperbaiki", value: "1", valueClass: "text-red-500" },
  { icon: CircleCheck, label: "Publish terakhir", value: "08 Nov · Pembayaran Sukun" },
];

export const legend: Status[] = [entered, sent, checking, draft, missing, failed, optional, s("Phase 2", "slate")];

export const columns = ["Cashflow", "RAB", "Purchase Order", "Pembayaran Supplier", "Jumlah Penerima Manfaat", "Saldo Rekening", "Master Menu *", "Penerimaan Barang *", "Status Kirim SIPGN/BGN"];

export const matrix: MatrixRow[] = [
  { code: "SKN", name: "Sukun", note: "Pilot Phase 1", active: true, cells: [missing, ready, checking, entered, missing, draft, entered, optional, missing] },
  { code: "LWG", name: "Lawang", note: "Pembanding Phase 1", cells: [failed, s("Tidak ada file", "pending"), sent, s("Belum dipakai", "slate"), sent, draft, entered, optional, missing] },
  { code: "DNM", name: "Donomulyo", note: "Rollout", cells: [], phase: "Phase 2" },
  { code: "PCK", name: "Poncokusumo", note: "Rollout", cells: [], phase: "Phase 2" },
  { code: "SML", name: "Kahean", note: "Readiness", cells: [], phase: "Phase 2b" },
  { code: "TRN", name: "Turen", note: "Rollout", cells: [], phase: "Phase 2" },
];

export const detail: DetailRow[] = [
  { icon: Wallet, type: "Cashflow", status: missing, approvedAt: "03 Nov 2026 16:48", action: "Ingatkan" },
  { icon: Utensils, type: "RAB", status: ready, action: "Buka" },
  { icon: FileText, type: "Purchase Order", status: checking, issue: s("2 perlu dicek", "amber"), action: "Buka" },
  { icon: Coins, type: "Pembayaran Supplier", status: entered, approvedAt: "08 Nov 2026 11:40" },
  { icon: UserRound, type: "Jumlah Penerima Manfaat", status: missing, action: "Ingatkan" },
  { icon: WalletCards, type: "Saldo Rekening", status: draft, approvedAt: "05 Nov 2026 10:10" },
  { icon: BookOpen, type: "Master Menu", status: entered, approvedAt: "06 Nov 2026 15:02" },
  { icon: Package, type: "Penerimaan Barang", status: optional },
  { icon: Send, type: "Status Kirim SIPGN/BGN", status: missing, action: "Ingatkan" },
];

export const deliveries: Delivery[] = [
  { title: "RAB P14", code: "SKN", note: "SIPGN – Aksis · Terkirim 09 Nov", status: s("Sudah terhubung", "green") },
  { title: "Nota belanja (per transaksi)", code: "SKN", note: "Portal BGN (satu per satu) · Sebagian 61 dari 78", status: s("Sudah terhubung", "green") },
  { title: "Laporan VA Harian", code: "SKN", note: "SIPGN · Terkirim tiap hari", status: s("Hanya untuk mencocokkan", "amber") },
  { title: "Food waste", code: "SKN", note: "SIPGN · —", status: s("Phase 2a", "slate") },
  { title: "Laporan keuangan BGN", code: "LWG", note: "SIPGN – Aksis · Terkirim 01 Okt", status: s("Perlu file ekspor", "amber") },
];
