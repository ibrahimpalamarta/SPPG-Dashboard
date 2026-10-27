import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { canSeeCost, dailyKitchenForRole, menuPlanForRole } from './visibility.js';

const menuPlanRow = {
  id: 1n,
  menuName: 'Ayam Goreng',
  energi: 250,
  hargaBahan: 12000,
  totalHarga: 480000,
};

describe('SCRUM-13 cost visibility', () => {
  test('the operational roles keep the cost columns', () => {
    for (const role of ['SUPER_ADMIN', 'MANAGEMENT', 'FINANCE', 'KEPALA_KITCHEN', 'DATA_ADMIN', 'DATA_STEWARD'] as const) {
      assert.equal(canSeeCost(role), true, role);
      const row = menuPlanForRole(menuPlanRow, role);
      assert.equal(row.hargaBahan, 12000, role);
      assert.equal(row.totalHarga, 480000, role);
    }
  });

  test('AHLI_GIZI gets no cost columns', () => {
    const row = menuPlanForRole(menuPlanRow, 'AHLI_GIZI');
    assert.equal('hargaBahan' in row, false);
    assert.equal('totalHarga' in row, false);
    // The non-sensitive fields must survive the strip.
    assert.equal(row.menuName, 'Ayam Goreng');
    assert.equal(row.energi, 250);
  });

  test('daily_kitchens hides the exact beneficiary count but keeps meal counts', () => {
    const row = { mealsPrepared: 500, mealsDistributed: 480, jumlahPm: 473 };

    const internal = dailyKitchenForRole(row, 'MANAGEMENT');
    assert.equal(internal.jumlahPm, 473);

    const outsider = dailyKitchenForRole(row, 'AHLI_GIZI');
    assert.equal('jumlahPm' in outsider, false);
    assert.equal(outsider.mealsPrepared, 500);
    assert.equal(outsider.mealsDistributed, 480);
  });

  test('stripping does not mutate the row it was given', () => {
    const row = { ...menuPlanRow };
    menuPlanForRole(row, 'AHLI_GIZI');
    assert.equal(row.hargaBahan, 12000);
  });
});
