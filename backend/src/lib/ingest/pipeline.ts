import type { UploadDomain } from '@prisma/client';
import { WorkbookError, readWorkbook } from './workbook.js';
import { stageRows, type DomainParser, type ParseContext, type StagedBatch, type StagingRepository } from './staging.js';
import { cashflowParser } from './cashflow.js';
import { menuParser } from './menu.js';
import { inputMakerParser } from './input-maker.js';
import { detectProfile, type Detection } from '../mapping/detect.js';
import type { MappingProfile } from '../mapping/profiles.js';
import type { Issue } from '../mapping/values.js';

/**
 * The generic fallback: every sheet. Domains with no dedicated parser
 * (RAB/PO/Payment/GR) are staged this way for Tahap 3 to read (B-RAW).
 */
const rawParser: DomainParser = (sheets, ctx) => stageRows(sheets, ctx);

/** One entry per domain with its own staging rules (SCRUM-35, 36, 118). */
const parsers: Partial<Record<UploadDomain, DomainParser>> = {
  CASHFLOW: cashflowParser,
  MENU: menuParser,
  INPUT_MAKER: inputMakerParser,
};

/** What the adapter made of the batch. Not stored yet (B-MAPOUT); it rides on the response. */
export type MappingSummary = {
  profileId: string;
  version: string;
  records: number;
  totals: Record<string, number>;
  issueCounts: Record<string, number>;
  /** The first ISSUE_PREVIEW issues, enough to start reviewing. */
  issues: Issue[];
};

const ISSUE_PREVIEW = 50;

export type PipelineResult =
  | { ok: true; batch: StagedBatch; detection: Detection; mapping: MappingSummary | null }
  | { ok: false; errorCode: string; errorSummary: string };

/**
 * read → parse → detect profile → stage → apply profile (SCRUM-39). Any failure leaves **no** staged rows for the batch
 * (step 5 of SCRUM-24); running it again for the same batch replaces what was
 * there (step 6). Status is decided by the caller from the result.
 */
export async function parseToStaging(buffer: Buffer, ctx: ParseContext, staging: StagingRepository): Promise<PipelineResult> {
  try {
    const sheets = await readWorkbook(buffer, ctx.sourceFileName);
    const parsed = (parsers[ctx.domain] ?? rawParser)(sheets, ctx);
    if (parsed.rows.length === 0) {
      await staging.deleteBatch(ctx.uploadBatchId);
      return { ok: false, errorCode: 'EMPTY_FILE', errorSummary: 'File tidak berisi baris data. Periksa isi file lalu upload ulang.' };
    }
    const detection = detectProfile(ctx, parsed.sheets);
    if (detection.ok) {
      for (const row of parsed.rows) {
        row.mappingProfileId = detection.profile.id;
        row.templateVersion = detection.profile.version;
      }
    }
    const batch = { domain: ctx.domain, ...parsed };
    await staging.replaceBatch(ctx.uploadBatchId, batch);
    return { ok: true, batch, detection, mapping: detection.ok ? summarise(batch, detection.profile) : null };
  } catch (err) {
    await staging.deleteBatch(ctx.uploadBatchId);
    if (err instanceof WorkbookError) return { ok: false, errorCode: err.code, errorSummary: err.message };
    throw err;
  }
}

function summarise(batch: StagedBatch, profile: MappingProfile): MappingSummary {
  const out = profile.apply(batch.sheets, batch.rows, profile);
  const issueCounts: Record<string, number> = {};
  for (const i of out.issues) issueCounts[i.code] = (issueCounts[i.code] ?? 0) + 1;
  return {
    profileId: profile.id,
    version: profile.version,
    records: out.records.length,
    totals: out.totals,
    issueCounts,
    issues: out.issues.slice(0, ISSUE_PREVIEW),
  };
}
