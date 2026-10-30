import { UploadStatus } from '@prisma/client';

/**
 * SCRUM-22/37: the only legal moves between batch states (PRD FR-UP-05).
 * FAILED and SUPERSEDED are terminal — a failed file is re-uploaded as a new
 * batch. PUBLISHED only ever moves to SUPERSEDED, when a correction of it is
 * published (SCRUM-96); it is never un-published.
 */
const TRANSITIONS: Record<UploadStatus, readonly UploadStatus[]> = {
  PROCESSING: ['NEEDS_REVIEW', 'NEEDS_MAPPING_UPDATE', 'FAILED'],
  NEEDS_REVIEW: ['PUBLISHED', 'FAILED'],
  NEEDS_MAPPING_UPDATE: ['PROCESSING', 'FAILED', 'SUPERSEDED'],
  PUBLISHED: ['SUPERSEDED'],
  FAILED: [],
  SUPERSEDED: [],
};

export const canTransition = (from: UploadStatus, to: UploadStatus): boolean =>
  TRANSITIONS[from].includes(to);
