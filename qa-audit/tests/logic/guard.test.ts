import { describe, expect, it } from 'vitest';
import { assertSafeTarget } from '../../scripts/guard.js';

describe('production guard', () => {
  it('[QA-GUARD] menerima localhost dan host staging yang dideklarasikan', () => {
    expect(() => assertSafeTarget('http://localhost:13000/admin/', {})).not.toThrow();
    expect(() => assertSafeTarget('postgresql://postgres:x@127.0.0.1:15432/sppg_qa', {})).not.toThrow();
    expect(() => assertSafeTarget('https://staging.example.test/admin/', { QA_STAGING_URL: 'https://staging.example.test' })).not.toThrow();
  });

  it('[QA-GUARD] menolak host lain, termasuk production', () => {
    expect(() => assertSafeTarget('https://sppg.example.go.id/admin/', {})).toThrow(/guard/);
    expect(() => assertSafeTarget('postgresql://u:p@prod-db.rds.amazonaws.com:5432/x', { QA_STAGING_URL: 'https://staging.example.test' })).toThrow(/guard/);
  });
});
