import type { SourceSystem, UploadDomain } from '@prisma/client';
import type { RawCell } from './workbook.js';

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
};

export type StagedBatch = { domain: UploadDomain; sheets: StagedSheet[]; rows: StagingRow[] };

/**
 * `{kitchen}:{domain}:{hash[:12]}:{sheet}:{row}` — the same file always yields
 * the same ids, which is what lets publish (SCRUM-95) refuse to double-count a
 * re-upload. The sheet name is part of the key, so it is encoded.
 */
export const sourceRecordId = (kitchen: string, domain: UploadDomain, fileHash: string, sheet: string, row: number) =>
  `${kitchen}:${domain}:${fileHash.slice(0, 12)}:${encodeURIComponent(sheet)}:${row}`;

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
