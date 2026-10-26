import { UploadStatus } from '@prisma/client';

/**
 * SCRUM-22/37: the only legal moves between batch states (PRD FR-UP-05).
 * FAILED, SUPERSEDED and PUBLISHED are terminal — a failed file is re-uploaded as a new
 * batch, and a published one is never un-published from here.
 */
const TRANSITIONS: Record<UploadStatus, readonly UploadStatus[]> = {
  PROCESSING: ['NEEDS_REVIEW', 'NEEDS_MAPPING_UPDATE', 'FAILED'],
  NEEDS_REVIEW: ['READY', 'FAILED'],
  NEEDS_MAPPING_UPDATE: ['PROCESSING', 'FAILED', 'SUPERSEDED'],
  READY: ['PUBLISHED', 'NEEDS_REVIEW'],
  PUBLISHED: [],
  FAILED: [],
  SUPERSEDED: [],
};

export const canTransition = (from: UploadStatus, to: UploadStatus): boolean =>
  TRANSITIONS[from].includes(to);
