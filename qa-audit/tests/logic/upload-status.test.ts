import { describe, expect, it } from 'vitest';
import { canTransition } from '../../../backend/src/lib/upload-status.js';

describe('status batch upload', () => {
  it('[FR-UP-05] batch Needs Mapping Update tidak bisa langsung Published', () => {
    expect(canTransition('NEEDS_MAPPING_UPDATE', 'PUBLISHED')).toBe(false);
    expect(canTransition('NEEDS_MAPPING_UPDATE', 'READY')).toBe(false);
  });

  it('[FR-UP-05] hanya batch Ready yang bisa Published', () => {
    expect(canTransition('READY', 'PUBLISHED')).toBe(true);
    for (const from of ['PROCESSING', 'NEEDS_REVIEW', 'FAILED'] as const) expect(canTransition(from, 'PUBLISHED')).toBe(false);
  });

  it('[FR-UP-05] Published dan Failed adalah status akhir', () => {
    for (const to of ['PROCESSING', 'NEEDS_REVIEW', 'READY', 'FAILED'] as const) {
      expect(canTransition('PUBLISHED', to)).toBe(false);
      expect(canTransition('FAILED', to)).toBe(false);
    }
  });
});
