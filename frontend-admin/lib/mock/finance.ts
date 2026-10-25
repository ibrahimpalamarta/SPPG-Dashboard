// ponytail: static mockup data until the finance API exists; replace with a fetch then.
import { Hash, TrendingUp, TriangleAlert, WalletCards, type LucideIcon } from "lucide-react";
import type { Tone } from "@/components/ui/badge";

type Stat = { icon: LucideIcon; label: string; value: string; unit?: string };
type Supplier = { name: string; amount: string; percent: string; progress: number };
type CategoryRow = { category: string; written: string; value: string; muted?: boolean };
type Chip = { label: string; tone: Tone };
type BalanceSource = { source: string; balance?: string; role: Chip };
type Transfer = { date: string; ref: string; note: string; amount: string };

export const stats: Stat[] = [
  { icon: WalletCards, label: "Belanja ke supplier", value: "Rp262,6 jt" },
  { icon: Hash, label: "Jumlah transaksi", value: "110" },
  { icon: TrendingUp, label: "Rata-rata belanja per hari", value: "Rp26,3 jt" },
  { icon: TriangleAlert, label: "Ditahan (belum dikonfirmasi)", value: "7", unit: "baris" },
];

export const suppliers: Supplier[] = [
  { name: "Toko Nasya", amount: "Rp27,1 jt", percent: "10,3%", progress: 100 },
  { name: "Grosir Sembako Pak Pa'at", amount: "Rp25,7 jt", percent: "9,8%", progress: 95 },
  { name: "UD Aneka Buah", amount: "Rp23,6 jt", percent: "9,0%", progress: 87 },
  { name: "Rahayu Bakso", amount: "Rp22,1 jt", percent: "8,4%", progress: 82 },
  { name: "Sonna De Andhara", amount: "Rp19,3 jt", percent: "7,4%", progress: 71 },
];

export const categories: CategoryRow[] = [
  { category: "Bahan Baku", written: "Bahan Baku", value: "Rp233.984.665" },
  { category: "Operasional", written: "Operasional", value: "Rp28.603.868" },
  { category: "Insentif & Fasilitas", written: "Insentif; Insentif Fasilitas; Operasional (tipe INSENTIF)", value: "Rp119.905.000" },
  { category: "Penggajian & Honor", written: "Operasional (tipe PENGGAJIAN)", value: "Rp10.000.000" },
  { category: "Kas kecil", written: "Petty cash · tidak dihitung", value: "Rp2.000.000", muted: true },
];

// Values in juta rupiah; the bar chart axis tops out at 1000.
export const monthly = [
  { label: "Mar", value: 300 },
  { label: "Apr", value: 520 },
  { label: "Mei", value: 360 },
  { label: "Jun", value: 250 },
  { label: "Jul", value: 360 },
  { label: "Agu", value: 462 },
];

// Values in juta rupiah; the line chart axis tops out at 50.
export const daily = [
  { label: "31/07", value: 22 },
  { label: "03/08", value: 26 },
  { label: "04/08", value: 23 },
  { label: "05/08", value: 30 },
  { label: "06/08", value: 32 },
  { label: "07/08", value: 25 },
  { label: "10/08", value: 13 },
  { label: "11/08", value: 34 },
  { label: "12/08", value: 33 },
  { label: "13/08", value: 25 },
];

export const balance = {
  total: "Rp186.420.500",
  gap: "Rp1.500.000",
  sources: [
    { source: "Laporan VA Harian (SIPGN)", balance: "Rp186.420.500", role: { label: "Calon sumber resmi", tone: "slate" } },
    { source: "LapKeu 2-mingguan", balance: "Rp184.920.500", role: { label: "Pembanding", tone: "slate" } },
    { source: "Mutasi bank", role: { label: "Pembanding", tone: "slate" } },
  ] satisfies BalanceSource[],
};

export const efi = {
  total: "Rp30.000.000",
  latest: "07 Agu 2026 · TXN-I0112",
  transfers: [
    { date: "07 Agu 2026", ref: "TXN-I0112", note: "Pembayaran Insentif Yayasan Minggu 1 · Yayasan Edufarmers", amount: "Rp30.000.000" },
    { date: "31 Jul 2026", ref: "TXN-I0110", note: "Pembayaran Insentif Yayasan Minggu 2 · Yayasan Edufarmers", amount: "Rp30.000.000" },
  ] satisfies Transfer[],
};
