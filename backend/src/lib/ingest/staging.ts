import type { Prisma, PrismaClient, SourceSystem, UploadDomain } from '@prisma/client';
import { writeCanonical, type MappedRecords } from '../mapping/persist.js';
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
  /** SCRUM-42: Master Reference "Kategori pengeluaran". Absent (dry run, tests) = categories are not normalised. */
  expenseCategories?: string[];
  /** "Ubah Mapping": `sheet|column letter` → canonical field the uploader says it holds; "" = not used. */
  columnMap?: Record<string, string>;
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
  /**
   * Delete-then-insert for one batch, so a re-parse never leaves stale rows.
   * `mapped` (the adapter's output) is stored with it, in the same transaction.
   */
  replaceBatch(uploadBatchId: string, batch: StagedBatch, mapped?: MappedRecords): Promise<void>;
  deleteBatch(uploadBatchId: string): Promise<void>;
  getBatch(uploadBatchId: string): Promise<StagedBatch | undefined>;
}

/** Unit tests and dry-run only: rows live in process memory. */
export class InMemoryStagingRepository implements StagingRepository {
  private readonly batches = new Map<string, StagedBatch>();
  readonly mapped = new Map<string, MappedRecords>();

  async replaceBatch(uploadBatchId: string, batch: StagedBatch, mapped?: MappedRecords) {
    this.batches.set(uploadBatchId, batch);
    if (mapped) this.mapped.set(uploadBatchId, mapped);
    else this.mapped.delete(uploadBatchId);
  }

  async deleteBatch(uploadBatchId: string) {
    this.batches.delete(uploadBatchId);
    this.mapped.delete(uploadBatchId);
  }

  async getBatch(uploadBatchId: string) {
    return this.batches.get(uploadBatchId);
  }
}

// Postgres caps a statement at 65535 bind parameters; 13 columns per row.
const CHUNK = 2000;

/**
 * Rows in `staging_rows` (SCRUM-24, B-RAW). Replace is one transaction, so a
 * re-parse never leaves a half-written batch.
 *
 * ponytail: the per-sheet summary (`StagedBatch.sheets`) is not stored (B-MAPOUT);
 * `getBatch` returns it empty. Add an `upload_sheets` table if something other
 * than tests needs to read it back.
 */
export class PrismaStagingRepository implements StagingRepository {
  constructor(private readonly db: PrismaClient) {}

  async replaceBatch(uploadBatchId: string, batch: StagedBatch, mapped?: MappedRecords) {
    await this.db.$transaction(async (tx) => {
      await tx.stagingRow.deleteMany({ where: { uploadBatchId } });
      for (let i = 0; i < batch.rows.length; i += CHUNK) {
        await tx.stagingRow.createMany({
          data: batch.rows.slice(i, i + CHUNK).map(({ cells, ...r }) => ({ ...r, domain: batch.domain, cells: cells as unknown as Prisma.InputJsonValue })),
        });
      }
      if (mapped) await writeCanonical(tx, uploadBatchId, mapped);
    }, { timeout: 20_000 });
  }

  async deleteBatch(uploadBatchId: string) {
    await this.db.stagingRow.deleteMany({ where: { uploadBatchId } });
  }

  async getBatch(uploadBatchId: string) {
    const rows = await this.db.stagingRow.findMany({ where: { uploadBatchId }, orderBy: { id: 'asc' } });
    const first = rows[0];
    if (!first) return undefined;
    return {
      domain: first.domain,
      sheets: [],
      rows: rows.map(({ id: _id, domain: _d, cells, ...r }) => ({ ...r, cells: cells as unknown as StagingRow['cells'] })),
    };
  }
}
