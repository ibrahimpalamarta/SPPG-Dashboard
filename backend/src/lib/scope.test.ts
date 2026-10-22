import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { kitchenScope, kitchenWhere, menuPlanWhere } from './scope.js';
import type { Role } from '../auth/roles.js';
import type { AppUser } from '../auth/user-sync.js';

function userWith(role: Role, ...kitchenIds: bigint[]): AppUser {
  return { id: 1n, role, kitchenScopes: kitchenIds.map((kitchenId) => ({ kitchenId })) } as AppUser;
}

describe('kitchenScope', () => {
  test('SUPER_ADMIN is unfiltered when no kitchen is requested', () => {
    const scope = kitchenScope(userWith('SUPER_ADMIN'));
    assert.equal(scope.ok, true);
    assert.deepEqual(kitchenWhere(scope as { ok: true }), {});
  });

  test('SUPER_ADMIN may narrow to any kitchen, scope rows notwithstanding', () => {
    const scope = kitchenScope(userWith('SUPER_ADMIN', 1n), 7n);
    assert.deepEqual(kitchenWhere(scope as { ok: true }), { kitchenId: { in: [7n] } });
  });

  test('DATA_ADMIN is pinned to its own dapur even without asking', () => {
    const scope = kitchenScope(userWith('DATA_ADMIN', 3n, 5n));
    assert.deepEqual(kitchenWhere(scope as { ok: true }), { kitchenId: { in: [3n, 5n] } });
  });

  test('DATA_ADMIN may narrow to any one of its own dapur', () => {
    const scope = kitchenScope(userWith('DATA_ADMIN', 3n, 5n), 5n);
    assert.deepEqual(kitchenWhere(scope as { ok: true }), { kitchenId: { in: [5n] } });
  });

  test('DATA_ADMIN asking for another dapur is denied, not silently widened', () => {
    assert.deepEqual(kitchenScope(userWith('DATA_ADMIN', 3n, 5n), 4n), { ok: false });
  });

  test('DATA_ADMIN with no dapur sees nothing — fails closed', () => {
    const scope = kitchenScope(userWith('DATA_ADMIN'));
    assert.deepEqual(kitchenWhere(scope as { ok: true }), { kitchenId: { in: [] } });
    assert.deepEqual(kitchenScope(userWith('DATA_ADMIN'), 1n), { ok: false });
  });

  test('INTERNAL with no rows sees all; with rows stays inside them', () => {
    assert.deepEqual(kitchenWhere(kitchenScope(userWith('INTERNAL')) as { ok: true }), {});
    assert.deepEqual(kitchenScope(userWith('INTERNAL', 5n), 6n), { ok: false });
  });

  test('menuPlanWhere scopes through the relation for tables with no kitchenId', () => {
    const scope = kitchenScope(userWith('DATA_ADMIN', 3n));
    assert.deepEqual(menuPlanWhere(scope as { ok: true }), { menuPlan: { kitchenId: { in: [3n] } } });

    const unrestricted = kitchenScope(userWith('SUPER_ADMIN'));
    assert.deepEqual(menuPlanWhere(unrestricted as { ok: true }), {});
  });
});
