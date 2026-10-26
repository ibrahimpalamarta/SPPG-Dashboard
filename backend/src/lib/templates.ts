import ExcelJS from 'exceljs';
import { PROFILES } from './mapping/profiles.js';

/** SCRUM-130/125: official empty templates; headers come from the active mapping profile so they cannot drift from it. */
export const TEMPLATE_KINDS = ['cashflow', 'menu'] as const;
export type TemplateKind = (typeof TEMPLATE_KINDS)[number];

export const TEMPLATE_VERSION = 'v1';

type Spec = { profileId: string; dataSheet: string; sheets: string[]; refs: Record<string, string[]> };

// Reference values seen in the Sukun/Lawang baseline; the master reference (B-DD) replaces them.
const SPECS: Record<TemplateKind, Spec> = {
  cashflow: {
    profileId: 'MAP-SKN-CF-001',
    dataSheet: 'Transaksi_Kas',
    sheets: ['Transaksi_Kas', 'Ringkasan_Transaksi', 'Referensi', 'Legenda_Kolom'],
    refs: {
      tipe: ['BELANJA', 'INSENTIF', 'PENGGAJIAN', 'PENERIMAAN'],
      arah: ['MASUK', 'KELUAR'],
      kategori: ['Bahan Baku', 'Operasional', 'Insentif Fasilitas'],
      status_review: ['TERKONFIRMASI', 'PERLU_REVIEW'],
    },
  },
  menu: {
    profileId: 'MAP-SKN-MENU-001',
    dataSheet: 'Menu',
    sheets: ['Menu', 'Referensi', 'Legenda_Kolom'],
    refs: { 'Menu Type': ['Basah', 'Kering'], Porsi: ['Besar', 'Kecil'] },
  },
};

// exceljs implements `dataValidations` but leaves it out of its typings.
type WithValidations = { dataValidations: { add: (range: string, v: ExcelJS.DataValidation) => void } };

export async function buildTemplate(kind: TemplateKind): Promise<Buffer> {
  const spec = SPECS[kind];
  const profile = PROFILES.find((p) => p.id === spec.profileId)!;
  const headers = Object.values(profile.columns);

  const wb = new ExcelJS.Workbook();
  const [data, ...rest] = spec.sheets.map((name) => wb.addWorksheet(name));
  data!.addRow(headers).font = { bold: true };

  const refSheet = rest.find((s) => s.name === 'Referensi')!;
  Object.entries(spec.refs).forEach(([header, values], i) => {
    const col = i + 1;
    refSheet.getColumn(col).values = [header, ...values];
    const target = headers.findIndex((h) => h.toLowerCase() === header.toLowerCase()) + 1;
    if (target > 0) {
      const letter = data!.getColumn(target).letter;
      const refLetter = refSheet.getColumn(col).letter;
      (data as unknown as WithValidations).dataValidations.add(`${letter}2:${letter}5000`, {
        type: 'list',
        allowBlank: true,
        formulae: [`Referensi!$${refLetter}$2:$${refLetter}$${values.length + 1}`],
      });
    }
  });

  const legend = rest.find((s) => s.name === 'Legenda_Kolom')!;
  legend.addRow(['kolom', 'keterangan']).font = { bold: true };
  headers.forEach((h) => legend.addRow([h, 'Wajib sesuai Upload Contract v1']));
  legend.addRow(['template_version', `${kind}-${TEMPLATE_VERSION}`]);
  wb.keywords = `template_version=${kind}-${TEMPLATE_VERSION}`;

  return Buffer.from((await wb.xlsx.writeBuffer()) as unknown as ArrayBuffer);
}
