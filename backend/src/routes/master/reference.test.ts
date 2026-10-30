import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response, Router } from 'express';
import { kitchenRouter } from './kitchen.js';
import { ingredientRouter } from './ingredient.js';
import { referenceEntryRouter } from './reference-entry.js';
import type { Permission, Role } from '../../auth/roles.js';

// Default role map (migration 20261025000000_internal_auth). ADMIN holds everything.
const DATA_ADMIN: Permission[] = ['upload:create', 'upload:view', 'mapping:view', 'mapping:propose', 'reference:view', 'dashboard:view'];

/** Drives the router with an empty body: a 403 means the guard stopped it, a 400 means it got past to validation. */
function hit(router: Router, method: string, url: string, role: Role, permissions: Permission[], body: unknown = {}) {
  return new Promise<number>((resolve, reject) => {
    const req = { method, url, body, query: {}, headers: {}, user: { role, permissions } } as unknown as Request;
    const res = {
      status(code: number) {
        resolve(code);
        return this;
      },
      json() {
        return this;
      },
    } as unknown as Response;
    router(req, res, () => reject(new Error('no route matched')));
  });
}

describe('SCRUM-20: Data Reference writes need reference:edit', () => {
  for (const [name, router, url] of [
    ['kitchens', kitchenRouter, '/1'],
    ['ingredients', ingredientRouter, '/1'],
  ] as const) {
    test(`${name}: Data Operasional is refused on create and update`, async () => {
      assert.equal(await hit(router, 'POST', '/', 'DATA_ADMIN', DATA_ADMIN), 403);
      assert.equal(await hit(router, 'PATCH', url, 'DATA_ADMIN', DATA_ADMIN), 403);
    });

    test(`${name}: ADMIN passes the guard`, async () => {
      assert.equal(await hit(router, 'POST', '/', 'ADMIN', ['reference:edit']), 400);
    });
  }

  // referenceEntryRouter only has GET and PATCH (no create), so it runs its own pair here.
  test('reference entries: Data Operasional is refused on update', async () => {
    assert.equal(await hit(referenceEntryRouter, 'PATCH', '/1', 'DATA_ADMIN', DATA_ADMIN), 403);
  });

  test('reference entries: ADMIN passes the guard', async () => {
    // Empty body passes referenceEntryUpdate (every field optional), so this needs a body validation rejects to prove it got past the guard.
    assert.equal(await hit(referenceEntryRouter, 'PATCH', '/1', 'ADMIN', ['reference:edit'], { pilihan: 'not-an-array' }), 400);
  });
});
