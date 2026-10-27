import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { fixture, staged, withRows } from '../ingest/fixtures.js';
import { PROFILES } from './profiles.js';
import type { RabDailyBudget } from './sukun-rab.js';

const profile = PROFILES.find((p) => p.id === 'MAP-SKN-RAB-001')!;

const run = async (file: Buffer) => {
  const { batch } = await staged(file, 'RAB');
  return profile.apply(batch.sheets, batch.rows, profile);
};

describe('MAP-SKN-RAB-001 → rab_daily_budget + rab_ingredient_budget (SCRUM-44/28)', () => {
  test('planned cost per day and segment adds up to the source Total Harga', async () => {
    const { mapping } = await staged(fixture('sukun-menu.csv'), 'RAB');
    assert.equal(mapping?.profileId, 'MAP-SKN-RAB-001');
    // Same sheet as the menu profile: 21 kept lines, 15.617.007 in Total Harga.
    assert.equal(mapping?.totals.planned_cost, 15617007);
  });

  test('lines are grouped per (date, segment) and keep their source row', async () => {
    const out = await run(
      withRows('sukun-menu.csv', [
        'Sukun,1,23/02/2026,Senin,Kering,Kecil,Susu UHT kecil,Susu ,125.00,125.00,100,1,pcs,75.00,3.75,3.75,6.25,0.00,84,,84,"Rp3,500","Rp294,000"',
        'Sukun,1,23/02/2026,Senin,Kering,kecil,Roti Abon,Roti,65.00,65.00,100,1,pcs,211.50,7.70,4.80,32.70,0.00,84,,84,"Rp2,500","Rp210,000"',
        'Sukun,1,23/02/2026,Senin,Kering,Besar,Susu UHT kecil,Susu ,125.00,125.00,100,1,pcs,75.00,3.75,3.75,6.25,0.00,893,,893,"Rp3,500","Rp3,125,500"',
      ]),
    );
    const days = out.records as RabDailyBudget[];
    assert.deepEqual(
      days.map((d) => [d.budget_date, d.portion_segment, d.planned_cost, d.lines.length]),
      [
        ['2026-02-23', 'Kecil', 504000, 2],
        ['2026-02-23', 'Besar', 3125500, 1],
      ],
    );
    assert.deepEqual(days.map((d) => d.package_count), [84, 893], 'pax column, not Jumlah PM');
    assert.match(days[0]!.lines[0]!.source_record_id, /^SKN:RAB:abcdef123456:/);
    assert.deepEqual(out.issues, []);
  });

  test('a line without Total Harga is reported and adds nothing', async () => {
    const out = await run(
      withRows('sukun-menu.csv', [
        'Sukun,1,23/02/2026,Senin,Kering,Kecil,Susu UHT kecil,Susu ,125.00,125.00,100,1,pcs,75.00,3.75,3.75,6.25,0.00,84,,84,"Rp3,500",',
        'Sukun,1,23/02/2026,Senin,Kering,Kecil,Roti Abon,Roti,65.00,65.00,100,1,pcs,211.50,7.70,4.80,32.70,0.00,84,,84,"Rp2,500","Rp210,000"',
      ]),
    );
    assert.equal((out.records as RabDailyBudget[])[0]!.planned_cost, 210000);
    assert.ok(out.issues.some((i) => i.code === 'NO_LINE_TOTAL' && i.rule === 'DQ-019'));
  });
});
