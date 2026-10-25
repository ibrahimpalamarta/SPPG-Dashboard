import type { SourceSystem, UploadDomain } from '@prisma/client';
import { DEFAULT_HEADER_OPTIONS, detectHeaderRow, isBlankRow, type RawCell, type RawSheet } from './workbook.js';

/**
 * One staged source row. The first block is PRD §7.2 traceability [PRD]; the
 * second block (`sheetName`, `sourceRowNumber`, `cells`) is the raw-preserving
 * part and is [USULAN] until the staging tables are approved (B-SCHEMA).
 */
export type StagingRow = {
  uploadBatchId: string;
  sourceRecordId: string;
  kitchenId: string;
  sourceSystem: SourceSystem;
  sourceFileName: string;
  templateVersion: string | null;
  mappingProfileId: string | null;
  loadedAt: Date;

  sheetName: string;
  sourceRowNumber: number;
  /** Column letter → cell exactly as read. Keyed by letter, not header text,
   * so duplicate or blank headers lose nothing. */
  cells: Record<string, RawCell>;
};

/** Per-sheet facts profile detection (SCRUM-39) needs without re-reading the file. */
export type StagedSheet = {
  name: string;
  index: number;
  headerRow: number | null;
  /** Column letter → header text as written. */
  headers: Record<string, string>;
  rowCount: number;
  /** Why a sheet was deliberately not staged (e.g. personal data). */
  skipped?: string;
};

export type StagedBatch = { domain: UploadDomain; sheets: StagedSheet[]; rows: StagingRow[] };

/**
 * `{kitchen}:{domain}:{hash[:12]}:{sheet}:{row}` — the same file always yields
 * the same ids, which is what lets publish (SCRUM-95) refuse to double-count a
 * re-upload. The sheet name is part of the key, so it is encoded.
 */
export const sourceRecordId = (kitchen: string, domain: UploadDomain, fileHash: string, sheet: string, row: number) =>
  `${kitchen}:${domain}:${fileHash.slice(0, 12)}:${encodeURIComponent(sheet)}:${row}`;

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
 * Says why a sheet must not be staged, or null to stage it. Gets the header
 * texts so a rule can look at columns instead of trusting sheet names.
 */
export type SheetRule = (sheet: RawSheet, headers: string[]) => string | null;

/** Lowercase, letters and digits only: "Transaksi_Kas", "transaksi kas" and
 * "TRANSAKSI-KAS" compare equal (FR-MAP-03: local differences are tolerated). */
export const loose = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Every non-blank row below each sheet's detected header, cells untouched.
 * Sheets `rule` rejects are listed in the summary with the reason and no rows.
 */
export function stageRows(sheets: RawSheet[], ctx: ParseContext, rule?: SheetRule): Pick<StagedBatch, 'sheets' | 'rows'> {
  const staged: StagedSheet[] = [];
  const rows: StagingRow[] = [];

  for (const sheet of sheets) {
    const header = detectHeaderRow(sheet, DEFAULT_HEADER_OPTIONS);
    const headers = Object.fromEntries(Object.entries(header?.cells ?? {}).map(([col, c]) => [col, String(c.value ?? '')]));
    const skipped = header ? (rule?.(sheet, Object.values(headers)) ?? undefined) : undefined;
    const dataRows = header && !skipped ? sheet.rows.filter((r) => r.rowNumber > header.rowNumber && !isBlankRow(r)) : [];

    staged.push({
      name: sheet.name,
      index: sheet.index,
      headerRow: header?.rowNumber ?? null,
      headers,
      rowCount: dataRows.length,
      ...(skipped && { skipped }),
    });

    for (const r of dataRows) {
      rows.push({
        uploadBatchId: ctx.uploadBatchId,
        sourceRecordId: sourceRecordId(ctx.kitchenCode, ctx.domain, ctx.fileHash, sheet.name, r.rowNumber),
        kitchenId: ctx.kitchenCode,
        sourceSystem: ctx.sourceSystem,
        sourceFileName: ctx.sourceFileName,
        // Set by the pipeline once a profile is detected (SCRUM-39); the template's own
        // version cell is SCRUM-130 (B-TPLVER).
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
}

export interface StagingRepository {
  /** Delete-then-insert for one batch, so a re-parse never leaves stale rows. */
  replaceBatch(uploadBatchId: string, batch: StagedBatch): Promise<void>;
  deleteBatch(uploadBatchId: string): Promise<void>;
  getBatch(uploadBatchId: string): Promise<StagedBatch | undefined>;
}

/**
 * ponytail: process memory, so staged rows vanish on restart and are not
 * shared between ECS tasks. The batch row (status, counts) is in Postgres and
 * the original file is in S3; only the parsed copy is volatile. Swap for a
 * Prisma implementation once `finance_txn_upload` / `menu_recipe_upload` and
 * the raw columns are approved (projects/jira/schema-proposals/SCRUM-24.md).
 */
export class InMemoryStagingRepository implements StagingRepository {
  private readonly batches = new Map<string, StagedBatch>();

  async replaceBatch(uploadBatchId: string, batch: StagedBatch) {
    this.batches.set(uploadBatchId, batch);
  }

  async deleteBatch(uploadBatchId: string) {
    this.batches.delete(uploadBatchId);
  }

  async getBatch(uploadBatchId: string) {
    return this.batches.get(uploadBatchId);
  }
}

/** The process-wide instance the upload controller writes to. */
export const stagingRepository: StagingRepository = new InMemoryStagingRepository();
