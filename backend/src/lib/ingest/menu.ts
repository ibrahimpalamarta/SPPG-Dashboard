import { loose, stageRows, type DomainParser } from './staging.js';

/**
 * SCRUM-36: Menu staging (`menu_recipe_upload`, 1 row per ingredient of one
 * menu on one day for one portion segment). Staging only — no number, date or
 * segment normalisation; that is the profile's job (SCRUM-31/73).
 *
 * Contract source: MASTER DATA MENU Sukun (23 columns: dapur, Periode,
 * Tanggal, Hari, Menu Type, Porsi, Menu, Bahan, Berat Kotor/Bersih, BDD, URT,
 * five nutrients, Jumlah PM, Kebutuhan Bahan/Kemasan, Harga Bahan, Total
 * Harga). Periode is not required here: PCK has none and gets it from batch
 * metadata in its profile.
 *
 * A sheet is data when its header has Tanggal, Porsi and Bahan — the sheet
 * name ("12", "Menu", a month) says nothing, so it is not looked at.
 */
const REQUIRED = ['tanggal', 'porsi', 'bahan'];

export const menuParser: DomainParser = (sheets, ctx) =>
  stageRows(sheets, ctx, (_sheet, headers) => {
    const have = new Set(headers.map(loose));
    return REQUIRED.every((h) => have.has(h)) ? null : 'Bukan sheet data menu (tidak ada kolom Tanggal, Porsi, Bahan)';
  });
