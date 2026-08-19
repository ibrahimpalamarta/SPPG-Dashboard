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
    for (const role of ['SUPER_ADMIN', 'DATA_ADMIN', 'INTERNAL'] as const) {
      assert.equal(canSeeCost(role), true, role);
      const row = menuPlanForRole(menuPlanRow, role);
      assert.equal(row.hargaBahan, 12000, role);
      assert.equal(row.totalHarga, 480000, role);
    }
  });

  test('a PUBLIC-role token gets no cost columns', () => {
    const row = menuPlanForRole(menuPlanRow, 'PUBLIC');
    assert.equal('hargaBahan' in row, false);
    assert.equal('totalHarga' in row, false);
    // The non-sensitive fields must survive the strip.
    assert.equal(row.menuName, 'Ayam Goreng');
    assert.equal(row.energi, 250);
  });

  test('CMS_ADMIN manages content, not budgets, so it gets no cost columns', () => {
    assert.equal(canSeeCost('CMS_ADMIN'), false);
    assert.equal('hargaBahan' in menuPlanForRole(menuPlanRow, 'CMS_ADMIN'), false);
  });

  test('daily_kitchens hides the exact beneficiary count but keeps meal counts', () => {
    const row = { mealsPrepared: 500, mealsDistributed: 480, jumlahPm: 473 };

    const internal = dailyKitchenForRole(row, 'INTERNAL');
    assert.equal(internal.jumlahPm, 473);

    const outsider = dailyKitchenForRole(row, 'PUBLIC');
    assert.equal('jumlahPm' in outsider, false);
    assert.equal(outsider.mealsPrepared, 500);
    assert.equal(outsider.mealsDistributed, 480);
  });

  test('stripping does not mutate the row it was given', () => {
    const row = { ...menuPlanRow };
    menuPlanForRole(row, 'PUBLIC');
    assert.equal(row.hargaBahan, 12000);
  });
});
