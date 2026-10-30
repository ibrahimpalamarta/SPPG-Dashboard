import { z } from 'zod';
import { GovernmentSystem, SubmissionStatus } from '@prisma/client';
import { optionalBigInt } from './common.js';
import { pageQuery } from '../lib/pagination.js';

/** SCRUM-59/107: one report of one source record to SIPGN/POP/Aksis. */
export const governmentSubmissionCreate = z.object({
  system: z.nativeEnum(GovernmentSystem),
  module: z.string().trim().min(1).max(100),
  sourceRecordId: z.string().trim().min(1).max(300),
  status: z.nativeEnum(SubmissionStatus),
  submittedAt: z.coerce.date(),
  externalRef: z.string().trim().max(200).nullish(),
  note: z.string().trim().max(2000).nullish(),
});

export const governmentSubmissionListQuery = pageQuery.extend({
  kitchenId: optionalBigInt,
  system: z.nativeEnum(GovernmentSystem).optional(),
  sourceRecordId: z.string().max(300).optional(),
});
