import { loose, type ParseContext, type StagedSheet } from '../ingest/staging.js';
import { PROFILES, type MappingProfile } from './profiles.js';

export type ColumnDiff = { sheet: string; missing: string[]; unexpected: string[] };

export type Detection =
  | { ok: true; profile: MappingProfile }
  | { ok: false; errorCode: 'PROFILE_NOT_DETECTED' | 'PROFILE_AMBIGUOUS'; diff: ColumnDiff[] };

const diffSheet = (sheet: StagedSheet, profile: MappingProfile): ColumnDiff => {
  const have = Object.values(sheet.headers).filter((h) => h.trim() !== '');
  const want = Object.values(profile.columns);
  const haveLoose = new Set(have.map(loose));
  const wantLoose = new Set(want.map(loose));
  return {
    sheet: sheet.name,
    missing: want.filter((h) => !haveLoose.has(loose(h))),
    unexpected: have.filter((h) => !wantLoose.has(loose(h))),
  };
};

/** The profiles registered for this kitchen + domain + source. */
export const profilesFor = (ctx: Pick<ParseContext, 'kitchenCode' | 'domain' | 'sourceSystem'>, profiles: MappingProfile[] = PROFILES) =>
  profiles.filter((p) => p.kitchenCode === ctx.kitchenCode && p.domain === ctx.domain && p.sourceSystem === ctx.sourceSystem);

/**
 * SCRUM-39. A file is recognised when exactly one profile for its kitchen +
 * domain + source covers every staged sheet (extra columns are tolerated, a
 * missing one is not). Anything else is quarantined with the column diff of
 * the closest candidate, so the uploader sees what to fix (SCRUM-94).
 */
export function detectProfile(
  ctx: Pick<ParseContext, 'kitchenCode' | 'domain' | 'sourceSystem'>,
  sheets: StagedSheet[],
  profiles: MappingProfile[] = PROFILES,
): Detection {
  const data = sheets.filter((s) => s.headerRow !== null && !s.skipped);
  const candidates = profilesFor(ctx, profiles)
    .map((profile) => ({ profile, diff: data.map((s) => diffSheet(s, profile)) }))
    .map((c) => ({ ...c, missing: c.diff.reduce((n, d) => n + d.missing.length, 0) }))
    .sort((a, b) => a.missing - b.missing || a.profile.id.localeCompare(b.profile.id));

  const matches = candidates.filter((c) => c.missing === 0);
  const [only] = matches;
  if (only && matches.length === 1) return { ok: true, profile: only.profile };
  return {
    ok: false,
    errorCode: matches.length > 1 ? 'PROFILE_AMBIGUOUS' : 'PROFILE_NOT_DETECTED',
    diff: candidates[0]?.diff ?? [],
  };
}
