import type { Tone } from "@/components/ui/badge";

export type ReferenceEntry<F> = { id: string; sortOrder: number; fields: F };

export type KamusFields = { nama: string; artinya: string; contoh: string; wajib: string; aturan: string; kerahasiaan: string };
export type AturanFields = { cek: string; aturan: string; tingkat: string; tingkatTone: Tone; akibat: string };
export type KodeFields = { daftar: string; pilihan: string[]; catatan: string };
