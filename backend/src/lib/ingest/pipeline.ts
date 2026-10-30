import type { UploadDomain } from '@prisma/client';
import { WorkbookError, detectHeaderRow, readWorkbook, type RawSheet } from './workbook.js';
import { loose, stageRows, type DomainParser, type ParseContext, type StagedBatch, type StagedSheet, type StagingRepository } from './staging.js';
import { cashflowParser } from './cashflow.js';
import { menuParser } from './menu.js';
import { inputMakerParser } from './input-maker.js';
import { detectProfile, profilesFor, type Detection } from '../mapping/detect.js';
import type { MappingOutput, MappingProfile } from '../mapping/profiles.js';
import type { Normalization } from '../mapping/values.js';
import type { CashflowTxn } from '../mapping/sukun-cashflow.js';
import { normalizeCategories, reconcileRingkasan } from '../mapping/cashflow-checks.js';
import { classify, type ClassifiedIssue } from '../validation/rules.js';

/**
 * The generic fallback: every sheet. Domains with no dedicated parser
 * (RAB/PO/Payment/GR) are staged this way for Tahap 3 to read (B-RAW).
 */
const rawParser: DomainParser = (sheets, ctx) => stageRows(sheets, ctx);

/** One entry per domain with its own staging rules (SCRUM-35, 36, 118). */
const parsers: Partial<Record<UploadDomain, DomainParser>> = {
  CASHFLOW: cashflowParser,
  MENU: menuParser,
  // The RAB is the menu costing sheet (MAP-SKN-RAB-001).
  RAB: menuParser,
  INPUT_MAKER: inputMakerParser,
};

/** One header of a staged sheet and the canonical field the profile reads it into (null: not used). */
export type MappedColumn = { sheet: string; column: string; header: string; field: string | null };

/** What the adapter made of the batch, stored on the batch for the Validasi Data page (B-MAPOUT) and returned on upload. */
export type MappingSummary = {
  profileId: string;
  version: string;
  records: number;
  totals: Record<string, number>;
  issueCounts: Record<string, number>;
  issues: ClassifiedIssue[];
  normalized: Normalization[];
  columns: MappedColumn[];
};

/** A canonical field of the SOP and the header the template writes it under. */
export type SopField = { field: string; header: string };

export type PipelineResult =
  | { ok: true; batch: StagedBatch; detection: Detection; mapping: MappingSummary | null; columns: MappedColumn[]; fields: SopField[] }
  | { ok: false; errorCode: string; errorSummary: string };

const NOT_USED = '(tidak dipakai)';

/**
 * "Ubah Mapping": rewrites the header cells the uploader re-pointed to the SOP's own header text, so detection and
 * the profile read them like any other file. Returns each rewritten header's original text, keyed `sheet|column`.
 */
function applyColumnMap(sheets: RawSheet[], map: Record<string, string>, profile: MappingProfile | undefined) {
  const originals = new Map<string, string>();
  for (const sheet of sheets) {
    const header = detectHeaderRow(sheet);
    if (!header) continue;
    for (const [column, cell] of Object.entries(header.cells)) {
      const key = `${sheet.name}|${column}`;
      const field = map[key];
      const next = field === undefined ? undefined : field === '' ? NOT_USED : profile?.columns[field];
      if (next === undefined) continue;
      originals.set(key, String(cell.value ?? ''));
      header.cells[column] = { value: next, type: 'string' };
    }
  }
  return originals;
}

/**
 * read → parse → detect profile → stage → apply profile (SCRUM-39). Any failure leaves **no** staged rows for the batch
 * (step 5 of SCRUM-24); running it again for the same batch replaces what was
 * there (step 6). Status is decided by the caller from the result.
 */
export async function parseToStaging(buffer: Buffer, ctx: ParseContext, staging: StagingRepository): Promise<PipelineResult> {
  try {
    const sheets = await readWorkbook(buffer, ctx.sourceFileName);
    const candidate = profilesFor(ctx)[0];
    const originals = ctx.columnMap ? applyColumnMap(sheets, ctx.columnMap, candidate) : new Map<string, string>();
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
    const shown = detection.ok ? detection.profile : candidate;
    const columns = mappedColumns(batch.sheets, shown, originals);
    const fields = Object.entries(shown?.columns ?? {}).map(([field, header]) => ({ field, header }));
    if (!detection.ok) {
      await staging.replaceBatch(ctx.uploadBatchId, batch);
      return { ok: true, batch, detection, mapping: null, columns, fields };
    }
    const { profile } = detection;
    const out = profile.apply(batch.sheets, batch.rows, profile);
    if (profile.domain === 'CASHFLOW') {
      const txns = out.records as CashflowTxn[];
      if (ctx.expenseCategories) out.issues.push(...normalizeCategories(txns, ctx.expenseCategories));
      out.issues.push(...reconcileRingkasan(sheets, txns));
    }
    await staging.replaceBatch(ctx.uploadBatchId, batch, { profileId: profile.id, templateVersion: profile.version, loadedAt: ctx.loadedAt, domain: profile.domain, records: out.records, issues: out.issues });
    return { ok: true, batch, detection, mapping: summarise(profile, out, columns), columns, fields };
  } catch (err) {
    await staging.deleteBatch(ctx.uploadBatchId);
    if (err instanceof WorkbookError) return { ok: false, errorCode: err.code, errorSummary: err.message };
    throw err;
  }
}

/** Every header of the staged sheets with the field the profile reads it into; `originals` restores the text an override replaced. */
function mappedColumns(sheets: StagedSheet[], profile: MappingProfile | undefined, originals: Map<string, string>): MappedColumn[] {
  const fields = new Map(Object.entries(profile?.columns ?? {}).map(([field, header]) => [loose(header), field]));
  return sheets
    .filter((s) => s.headerRow !== null && !s.skipped)
    .flatMap((s) =>
      Object.entries(s.headers)
        .filter(([, header]) => header.trim() !== '')
        .map(([column, header]) => ({ sheet: s.name, column, header: originals.get(`${s.name}|${column}`) ?? header, field: fields.get(loose(header)) ?? null })),
    );
}

function summarise(profile: MappingProfile, out: MappingOutput, columns: MappedColumn[]): MappingSummary {
  const issueCounts: Record<string, number> = {};
  for (const i of out.issues) issueCounts[i.code] = (issueCounts[i.code] ?? 0) + 1;
  return {
    profileId: profile.id,
    version: profile.version,
    records: out.records.length,
    totals: out.totals,
    issueCounts,
    issues: classify(out.issues),
    normalized: out.normalized ?? [],
    columns,
  };
}
