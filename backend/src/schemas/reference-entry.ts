import { z } from 'zod';

export const referenceEntryKind = z.enum(['KAMUS', 'ATURAN', 'KODE']);
export type ReferenceEntryKind = z.infer<typeof referenceEntryKind>;

export const referenceEntryListQuery = z.object({ kind: referenceEntryKind });

/**
 * One table across three tabs (see schema.prisma `ReferenceEntry`), so this
 * is the union of every editable field across Kamus/Aturan/Kode — the
 * identifying column (nama/cek/daftar) and governance columns (wajib,
 * kerahasiaan, tingkat) stay fixed, edited only by a future migration.
 */
export const referenceEntryUpdate = z
  .object({
    artinya: z.string().min(1).max(500),
    contoh: z.string().max(200),
    aturan: z.string().min(1).max(300),
    akibat: z.string().max(200),
    catatan: z.string().max(200),
    pilihan: z.array(z.string().min(1).max(80)).min(1),
  })
  .partial()
  .strict();

export type ReferenceEntryUpdate = z.infer<typeof referenceEntryUpdate>;

export const EDITABLE_FIELDS: Record<ReferenceEntryKind, (keyof ReferenceEntryUpdate)[]> = {
  KAMUS: ['artinya', 'contoh', 'aturan'],
  ATURAN: ['aturan', 'akibat'],
  KODE: ['pilihan', 'catatan'],
};
