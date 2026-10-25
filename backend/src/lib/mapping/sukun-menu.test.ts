import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { fixture, staged } from '../ingest/fixtures.js';
import { PROFILES } from './profiles.js';
import type { MenuRecipeLine } from './sukun-menu.js';

const profile = PROFILES.find((p) => p.id === 'MAP-SKN-MENU-001')!;

async function lines() {
  const { batch } = await staged(fixture('sukun-menu.csv'), 'MENU');
  return profile.apply(batch.sheets, batch.rows, profile);
}

describe('MAP-SKN-MENU-001 → menu_recipe_line (SCRUM-31/73)', () => {
  test('one line per source row, the duplicate dropped and reported', async () => {
    const { mapping } = await staged(fixture('sukun-menu.csv'), 'MENU');
    assert.ok(mapping);
    assert.equal(mapping.records, 21, '22 rows, one Coleslaw/Kubis duplicate');
    assert.deepEqual(mapping.issueCounts, { MISSING_VALUE: 1, DAY_MISMATCH: 1, DUPLICATE_LINE: 1 });
    assert.equal(mapping.totals.line_total, 15617007);
  });

  test('segment and menu type spelling folded, numbers read in either notation', async () => {
    const records = (await lines()).records as MenuRecipeLine[];
    const [susu] = records;
    assert.ok(susu);
    assert.equal(susu.serving_date, '2026-02-23');
    assert.equal(susu.ingredient, 'Susu', 'trailing space trimmed');
    assert.equal(susu.unit_price, 3500);
    assert.equal(susu.line_total, 294000);

    assert.deepEqual([...new Set(records.map((l) => l.portion_segment))].sort(), ['Balita', 'Besar', 'Bumil', 'Busui', 'Kecil']);
    assert.deepEqual([...new Set(records.map((l) => l.menu_type))].sort(), ['Basah', 'Kering']);

    const acar = records.find((l) => l.menu_name === 'Acar')!;
    assert.equal(acar.gross_weight_g, 31.25);
    const pisang = records.find((l) => l.menu_name === 'Pisang')!;
    assert.equal(pisang.ingredient_need_kg, 1212);
  });

  test('lineage: every line points back to its staged row and kitchen', async () => {
    const { batch } = await staged(fixture('sukun-menu.csv'), 'MENU');
    const records = profile.apply(batch.sheets, batch.rows, profile).records as MenuRecipeLine[];
    const ids = new Set(batch.rows.map((r) => r.sourceRecordId));
    assert.ok(records.every((l) => ids.has(l.source_record_id) && l.kitchen_id === 'SKN'));
  });
});
