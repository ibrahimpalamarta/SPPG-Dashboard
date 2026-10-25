/**
 * SCRUM-132: bucket and rollout stage per dapur, keyed by `kitchens.code`.
 *
 * Config, not columns: `bucket`/`rollout_status` are not in the PRD's data
 * model, so they wait for schema approval (projects/jira/schema-proposals/
 * SCRUM-132.md). Values follow PRD §14. BRD v2 puts Lawang in Phase 2 instead
 * of "Phase 1 comparison" — OD-01, decisions.md K-01.
 *
 * A dapur without a code (Turen, B-TUREN) has no entry and reports NULL for
 * both, never a guessed stage.
 */
export const ROLLOUT_STATUSES = ['PILOT_PHASE_1', 'PHASE_1_COMPARISON', 'PHASE_2A', 'PHASE_2B'] as const;
export type RolloutStatus = (typeof ROLLOUT_STATUSES)[number];

const KITCHEN_ROLLOUT: Record<string, { bucket: 1 | 2; rolloutStatus: RolloutStatus }> = {
  SKN: { bucket: 1, rolloutStatus: 'PILOT_PHASE_1' },
  LWG: { bucket: 1, rolloutStatus: 'PHASE_1_COMPARISON' },
  DNM: { bucket: 1, rolloutStatus: 'PHASE_2A' },
  PCK: { bucket: 1, rolloutStatus: 'PHASE_2A' },
  SML: { bucket: 2, rolloutStatus: 'PHASE_2B' },
};

export function withRollout<K extends { code: string | null }>(kitchen: K) {
  const r = kitchen.code === null ? undefined : KITCHEN_ROLLOUT[kitchen.code];
  return { ...kitchen, bucket: r?.bucket ?? null, rolloutStatus: r?.rolloutStatus ?? null };
}

/** Codes at a rollout stage, for a Prisma `code: { in }` filter. */
export const codesByRolloutStatus = (status: RolloutStatus): string[] =>
  Object.entries(KITCHEN_ROLLOUT)
    .filter(([, r]) => r.rolloutStatus === status)
    .map(([code]) => code);
