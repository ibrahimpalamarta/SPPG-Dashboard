import { z } from 'zod';
import { IssueSeverity, IssueStatus } from '@prisma/client';
import { optionalBigInt } from './common.js';
import { pageQuery } from '../lib/pagination.js';

/** SCRUM-68: validation queue filters. */
export const validationIssueListQuery = pageQuery.extend({
  kitchenId: optionalBigInt,
  uploadBatchId: z.string().uuid().optional(),
  code: z.string().max(64).optional(),
  severity: z.nativeEnum(IssueSeverity).optional(),
  status: z.nativeEnum(IssueStatus).optional(),
});

/** Resolves every OPEN issue of one code in one batch, the way Validasi Data groups them. */
export const validationIssueResolve = z.object({
  uploadBatchId: z.string().uuid(),
  code: z.string().min(1).max(64),
  note: z.string().trim().min(1).max(2000),
});
