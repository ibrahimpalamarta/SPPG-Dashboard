import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import type { User } from '@prisma/client';
import { kitchenScope, kitchenWhere, menuPlanWhere } from './scope.js';
import type { Role } from '../auth/roles.js';

function userWith(role: Role, scopeId: bigint | null): User {
  return { id: 1n, role, scopeId } as User;
}

describe('kitchenScope', () => {
  test('SUPER_ADMIN is unfiltered when no kitchen is requested', () => {
    const scope = kitchenScope(userWith('SUPER_ADMIN', null));
    assert.equal(scope.ok, true);
    assert.deepEqual(kitchenWhere(scope as { ok: true }), {});
  });

  test('SUPER_ADMIN may narrow to any kitchen', () => {
    const scope = kitchenScope(userWith('SUPER_ADMIN', null), 7n);
    assert.deepEqual(kitchenWhere(scope as { ok: true }), { kitchenId: 7n });
  });

  test('DATA_ADMIN is pinned to its own dapur even without asking', () => {
    const scope = kitchenScope(userWith('DATA_ADMIN', 3n));
    assert.equal(scope.ok, true);
    assert.deepEqual(kitchenWhere(scope as { ok: true }), { kitchenId: 3n });
  });

  test('DATA_ADMIN asking for its own dapur is allowed', () => {
    const scope = kitchenScope(userWith('DATA_ADMIN', 3n), 3n);
    assert.deepEqual(kitchenWhere(scope as { ok: true }), { kitchenId: 3n });
  });

  test('DATA_ADMIN asking for another dapur is denied, not silently widened', () => {
    assert.deepEqual(kitchenScope(userWith('DATA_ADMIN', 3n), 4n), { ok: false });
  });

  test('a scoped role with no scope_id cannot request a kitchen', () => {
    // Fail closed: an INTERNAL account with scopeId null is unrestricted, but
    // one with a scope set must stay inside it.
    assert.deepEqual(kitchenScope(userWith('INTERNAL', 5n), 6n), { ok: false });
  });

  test('menuPlanWhere scopes through the relation for tables with no kitchenId', () => {
    const scope = kitchenScope(userWith('DATA_ADMIN', 3n));
    assert.deepEqual(menuPlanWhere(scope as { ok: true }), { menuPlan: { kitchenId: 3n } });

    const unrestricted = kitchenScope(userWith('SUPER_ADMIN', null));
    assert.deepEqual(menuPlanWhere(unrestricted as { ok: true }), {});
  });
});
