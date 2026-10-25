import type { UploadDomain } from '@prisma/client';
import { WorkbookError, readWorkbook } from './workbook.js';
import { stageRows, type DomainParser, type ParseContext, type StagedBatch, type StagingRepository } from './staging.js';
import { cashflowParser } from './cashflow.js';

/**
 * The generic fallback: every sheet. Domains with no dedicated parser
 * (RAB/PO/Payment/GR) are staged this way for Tahap 3 to read (B-RAW).
 */
const rawParser: DomainParser = (sheets, ctx) => stageRows(sheets, ctx);

/** One entry per domain with its own staging rules (SCRUM-35, 36, 118). */
const parsers: Partial<Record<UploadDomain, DomainParser>> = {
  CASHFLOW: cashflowParser,
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
    const parsed = (parsers[ctx.domain] ?? rawParser)(sheets, ctx);
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
