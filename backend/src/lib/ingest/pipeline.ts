import type { SourceSystem, UploadDomain } from '@prisma/client';
import {
  DEFAULT_HEADER_OPTIONS,
  WorkbookError,
  detectHeaderRow,
  isBlankRow,
  readWorkbook,
  type RawSheet,
} from './workbook.js';
import { sourceRecordId, type StagedBatch, type StagedSheet, type StagingRepository, type StagingRow } from './staging.js';

export type ParseContext = {
  uploadBatchId: string;
  kitchenCode: string;
  domain: UploadDomain;
  sourceSystem: SourceSystem;
  sourceFileName: string;
  fileHash: string;
  loadedAt: Date;
};

/** Turns the raw sheets into staged rows for one domain. */
export type DomainParser = (sheets: RawSheet[], ctx: ParseContext) => Pick<StagedBatch, 'sheets' | 'rows'>;

/**
 * Domain parsers register here (SCRUM-35 Cashflow, 36 Menu, 118 Input Maker).
 * A domain with none falls back to `rawParser`: every sheet, every non-blank
 * row below the detected header, cells untouched — the generic raw staging
 * that RAB/PO/Payment read in Tahap 3 (B-RAW).
 */
const parsers = new Map<UploadDomain, DomainParser>();

export function registerParser(domain: UploadDomain, parser: DomainParser): void {
  parsers.set(domain, parser);
}

export const rawParser: DomainParser = (sheets, ctx) => {
  const staged: StagedSheet[] = [];
  const rows: StagingRow[] = [];

  for (const sheet of sheets) {
    const header = detectHeaderRow(sheet, DEFAULT_HEADER_OPTIONS);
    const dataRows = header ? sheet.rows.filter((r) => r.rowNumber > header.rowNumber && !isBlankRow(r)) : [];

    staged.push({
      name: sheet.name,
      index: sheet.index,
      headerRow: header?.rowNumber ?? null,
      headers: Object.fromEntries(Object.entries(header?.cells ?? {}).map(([col, c]) => [col, String(c.value ?? '')])),
      rowCount: dataRows.length,
    });

    for (const r of dataRows) {
      rows.push({
        uploadBatchId: ctx.uploadBatchId,
        sourceRecordId: sourceRecordId(ctx.kitchenCode, ctx.domain, ctx.fileHash, sheet.name, r.rowNumber),
        kitchenId: ctx.kitchenCode,
        sourceSystem: ctx.sourceSystem,
        sourceFileName: ctx.sourceFileName,
        // diisi di SCRUM-130/39: read from the template's metadata cell or the profile.
        templateVersion: null,
        mappingProfileId: null,
        loadedAt: ctx.loadedAt,
        sheetName: sheet.name,
        sourceRowNumber: r.rowNumber,
        cells: r.cells,
      });
    }
  }
  return { sheets: staged, rows };
};

export type PipelineResult =
  | { ok: true; batch: StagedBatch }
  | { ok: false; errorCode: string; errorSummary: string };

/**
 * read → parse → stage. Any failure leaves **no** staged rows for the batch
 * (step 5 of SCRUM-24); running it again for the same batch replaces what was
 * there (step 6). Status is decided by the caller from the result.
 */
export async function parseToStaging(buffer: Buffer, ctx: ParseContext, staging: StagingRepository): Promise<PipelineResult> {
  try {
    const sheets = await readWorkbook(buffer);
    const parsed = (parsers.get(ctx.domain) ?? rawParser)(sheets, ctx);
    if (parsed.rows.length === 0) {
      await staging.deleteBatch(ctx.uploadBatchId);
      return { ok: false, errorCode: 'EMPTY_FILE', errorSummary: 'File tidak berisi baris data. Periksa isi file lalu upload ulang.' };
    }
    const batch = { domain: ctx.domain, ...parsed };
    await staging.replaceBatch(ctx.uploadBatchId, batch);
    return { ok: true, batch };
  } catch (err) {
    await staging.deleteBatch(ctx.uploadBatchId);
    if (err instanceof WorkbookError) return { ok: false, errorCode: err.code, errorSummary: err.message };
    throw err;
  }
}
