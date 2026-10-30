import type { IssueAction, IssueSeverity } from '@prisma/client';
import type { Issue } from '../mapping/values.js';
import type { Db } from '../../db.js';

type RuleMeta = { severity: IssueSeverity; action: IssueAction };

/**
 * SCRUM-33/51/34/85: severity and action per issue code the adapters emit
 * (08_Data_Quality_Rules). CRITICAL holds the whole batch out of READY and
 * publish until someone resolves it with a note; the rest is shown for review.
 */
export const RULES: Record<string, RuleMeta> = {
  // Finance (SCRUM-34)
  NO_TXN_ID: { severity: 'CRITICAL', action: 'REJECT' },
  TOTAL_INCONSISTENT: { severity: 'CRITICAL', action: 'REVIEW' },
  LINES_NOT_TOTAL: { severity: 'CRITICAL', action: 'REVIEW' },
  MISSING_REQUIRED: { severity: 'CRITICAL', action: 'REVIEW' },
  MISSING_AMOUNT: { severity: 'HIGH', action: 'REVIEW' },
  LINE_AMOUNT_MISMATCH: { severity: 'HIGH', action: 'REVIEW' },
  NEEDS_REVIEW: { severity: 'MEDIUM', action: 'FLAG' },
  // Menu / RAB (SCRUM-85/120)
  INVALID_DATE: { severity: 'CRITICAL', action: 'REJECT' },
  MISSING_VALUE: { severity: 'HIGH', action: 'REVIEW' },
  NO_LINE_TOTAL: { severity: 'HIGH', action: 'REVIEW' },
  IMPLAUSIBLE_VALUE: { severity: 'HIGH', action: 'REVIEW' },
  DAY_MISMATCH: { severity: 'MEDIUM', action: 'FLAG' },
  INGREDIENT_NEEDS_REVIEW: { severity: 'MEDIUM', action: 'FLAG' },
  URT_LOOKS_LIKE_DATE: { severity: 'MEDIUM', action: 'FLAG' },
  DUPLICATE_LINE: { severity: 'MEDIUM', action: 'NORMALIZE' },
  // Input Maker
  MISSING_DATE: { severity: 'HIGH', action: 'REVIEW' },
};

/** A code nobody registered yet is reviewed, never silently waved through. */
export const ruleOf = (code: string): RuleMeta => RULES[code] ?? { severity: 'HIGH', action: 'REVIEW' };

export type ClassifiedIssue = Issue & RuleMeta;

export const classify = (issues: Issue[]): ClassifiedIssue[] => issues.map((i) => ({ ...i, ...ruleOf(i.code) }));

/** SCRUM-51 quarantine: unresolved CRITICAL issues keep a batch out of READY and publish. */
export const openBlockers = (db: Pick<Db, 'validationIssue'>, uploadBatchId: string) =>
  db.validationIssue.count({ where: { uploadBatchId, severity: 'CRITICAL', status: 'OPEN' } });