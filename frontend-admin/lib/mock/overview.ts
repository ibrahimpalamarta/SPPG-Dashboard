// ponytail: static mockup data until the overview API exists; replace with a fetch then.
import { RefreshCw, Users, WalletCards, type LucideIcon } from "lucide-react";

export type Stat = { icon: LucideIcon; label: string; value: string; status: string };
type Supplier = { name: string; amount: string; progress: number };
type Expense = { label: string; amount: string; percent: number; color: string };

export const filters = ["SKN · Sukun", "P13 · 31 Jul–13 Agu 2026"];

export const stats: Stat[] = [
  { icon: Users, label: "Penerima Manfaat / hari", value: "Belum ada data", status: "Belum ada data" },
  { icon: WalletCards, label: "Saldo Rekening · per 27 Agu 2026", value: "Rp186,4 jt", status: "Belum resmi" },
  { icon: RefreshCw, label: "Transfer EFI Terakhir · 07 Agu 2026", value: "Rp30,0 jt", status: "Belum resmi" },
];

export const suppliers: Supplier[] = [
  { name: "Toko Nasya", amount: "Rp27,1 jt", progress: 100 },
  { name: "Grosir Sembako Pak Pa'at", amount: "Rp25,7 jt", progress: 94 },
  { name: "UD Aneka Buah", amount: "Rp23,6 jt", progress: 87 },
  { name: "Rahayu Bakso", amount: "Rp22,1 jt", progress: 81 },
  { name: "Sonna De Andhara", amount: "Rp19,3 jt", progress: 70 },
];

export const expenseTotal = "392,5 jt";

export const expenses: Expense[] = [
  { label: "Bahan Baku", amount: "Rp234,0 jt", percent: 59.6, color: "#10b981" },
  { label: "Operasional", amount: "Rp28,6 jt", percent: 7.3, color: "#34d399" },
  { label: "Insentif & Fasilitas", amount: "Rp119,9 jt", percent: 30.5, color: "#6ee7b7" },
  { label: "Penggajian & Honor", amount: "Rp10,0 jt", percent: 2.5, color: "#a7f3d0" },
];
