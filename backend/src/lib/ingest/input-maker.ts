import { loose, stageRows, type DomainParser } from './staging.js';

/**
 * SCRUM-86/118: Input Maker Upload v1 staging. Everything is staged as-is
 * except the bank columns (NOMER REKENING, REKENING A.N): the contract marks
 * them restricted, so the cells are emptied before they reach staging.
 */
const RESTRICTED = new Set(['nomerrekening', 'rekeningan']);

export const inputMakerParser: DomainParser = (sheets, ctx) => {
  const out = stageRows(sheets, ctx);
  const blocked = new Map(out.sheets.map((s) => [s.name, Object.entries(s.headers).filter(([, h]) => RESTRICTED.has(loose(h))).map(([col]) => col)]));
  for (const row of out.rows) {
    for (const col of blocked.get(row.sheetName) ?? []) if (row.cells[col]) row.cells[col] = { value: null, type: 'null' };
  }
  return out;
};
