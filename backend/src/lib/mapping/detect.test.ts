import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import type { StagedSheet } from '../ingest/staging.js';
import { fixture, staged } from '../ingest/fixtures.js';
import { detectProfile } from './detect.js';
import { PROFILES } from './profiles.js';

const ctx = { kitchenCode: 'SKN', domain: 'CASHFLOW', sourceSystem: 'INTERNAL' } as const;
const cashflow = PROFILES.find((p) => p.id === 'MAP-SKN-CF-001')!;

/** A staged sheet with the given header texts in columns A, B, C, … */
const sheet = (headers: string[], extra: Partial<StagedSheet> = {}): StagedSheet => ({
  name: 'Transaksi_Kas',
  index: 1,
  headerRow: 1,
  headers: Object.fromEntries(headers.map((h, i) => [String.fromCharCode(65 + i), h])),
  rowCount: 1,
  ...extra,
});

describe('detectProfile (SCRUM-26/39)', () => {
  test('the Sukun baselines are recognised and their staged rows carry the profile', async () => {
    const cf = await staged(fixture('sukun-cashflow.csv'), 'CASHFLOW');
    assert.ok(cf.detection.ok);
    assert.equal(cf.detection.profile.id, 'MAP-SKN-CF-001');
    assert.ok(cf.batch.rows.every((r) => r.mappingProfileId === 'MAP-SKN-CF-001' && r.templateVersion === '1'));

    const menu = await staged(fixture('sukun-menu.csv'), 'MENU');
    assert.ok(menu.detection.ok);
    assert.equal(menu.detection.profile.id, 'MAP-SKN-MENU-001');
  });

  test('header spelling may differ locally; extra columns are tolerated', () => {
    const headers = Object.values(cashflow.columns).map((h) => h.toUpperCase().replace('_', ' '));
    const out = detectProfile(ctx, [sheet([...headers, 'Kolom Tambahan'])]);
    assert.ok(out.ok);
  });

  test('a missing column quarantines the file with a diff naming it (SCRUM-94)', () => {
    const headers = Object.values(cashflow.columns).filter((h) => h !== 'jumlah_baris');
    const out = detectProfile(ctx, [sheet([...headers, 'jml'])]);
    assert.ok(!out.ok);
    assert.equal(out.errorCode, 'PROFILE_NOT_DETECTED');
    assert.deepEqual(out.diff, [{ sheet: 'Transaksi_Kas', missing: ['jumlah_baris'], unexpected: ['jml'] }]);
  });

  test('another kitchen, domain or source never borrows the Sukun profile', () => {
    const headers = Object.values(cashflow.columns);
    for (const other of [{ kitchenCode: 'DNM' }, { domain: 'MENU' }, { sourceSystem: 'EFI' }] as const) {
      const out = detectProfile({ ...ctx, ...other }, [sheet(headers)]);
      assert.equal(out.ok, false, JSON.stringify(other));
    }
  });

  test('every staged sheet must match; skipped sheets do not count', () => {
    const headers = Object.values(cashflow.columns);
    assert.equal(detectProfile(ctx, [sheet(headers), sheet(['txn_id', 'nominal'], { name: 'Lain' })]).ok, false);
    assert.ok(detectProfile(ctx, [sheet(headers), sheet(['nama'], { name: 'Insentif', skipped: 'Data pribadi' })]).ok);
  });

  test('two profiles that both fit are refused, not picked at random', () => {
    const twin = { ...cashflow, id: 'MAP-SKN-CF-002' };
    const out = detectProfile(ctx, [sheet(Object.values(cashflow.columns))], [cashflow, twin]);
    assert.ok(!out.ok);
    assert.equal(out.errorCode, 'PROFILE_AMBIGUOUS');
  });
});
