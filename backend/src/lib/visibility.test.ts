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
  test('both roles keep the cost columns', () => {
    for (const role of ['ADMIN', 'DATA_ADMIN'] as const) {
      assert.equal(canSeeCost(role), true, role);
      const row = menuPlanForRole(menuPlanRow, role);
      assert.equal(row.hargaBahan, 12000, role);
      assert.equal(row.totalHarga, 480000, role);
    }
  });

  test('daily_kitchens keeps the exact beneficiary count for both roles', () => {
    const row = { mealsPrepared: 500, mealsDistributed: 480, jumlahPm: 473 };
    assert.equal(dailyKitchenForRole(row, 'DATA_ADMIN').jumlahPm, 473);
    assert.equal(dailyKitchenForRole(row, 'ADMIN').jumlahPm, 473);
  });
});
