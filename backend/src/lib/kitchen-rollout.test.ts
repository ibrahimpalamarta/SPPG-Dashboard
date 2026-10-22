import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';
import type { Db } from '../db.js';
import { codesByRolloutStatus, withRollout } from './kitchen-rollout.js';
import { listKitchens } from '../controllers/master/kitchen.js';

describe('kitchen rollout config (SCRUM-132)', () => {
  test('attaches PRD §14 bucket and stage by code', () => {
    assert.deepEqual(withRollout({ code: 'SKN', name: 'Sukun' }), {
      code: 'SKN',
      name: 'Sukun',
      bucket: 1,
      rolloutStatus: 'PILOT_PHASE_1',
    });
    assert.equal(withRollout({ code: 'SML' }).bucket, 2);
  });

  test('a dapur without a code gets NULL, not a guessed stage', () => {
    const turen = withRollout({ code: null, name: 'Turen' });
    assert.equal(turen.bucket, null);
    assert.equal(turen.rolloutStatus, null);
  });

  test('codesByRolloutStatus lists every dapur at that stage', () => {
    assert.deepEqual(codesByRolloutStatus('PHASE_2A').sort(), ['DNM', 'PCK']);
  });

  test('GET /api/kitchens?rolloutStatus= narrows by code and returns the stage', async () => {
    let where: unknown;
    const db = {
      kitchen: {
        findMany: async (args: { where: unknown }) => {
          where = args.where;
          return [{ id: 2n, code: 'LWG', name: 'Lawang' }];
        },
        count: async () => 1,
      },
    } as unknown as Db;
    let body: { data: { rolloutStatus: string }[] } = { data: [] };
    const res = {
      status() {
        return this;
      },
      json(payload: unknown) {
        body = payload as typeof body;
        return this;
      },
    } as unknown as Response;

    const req = { valid: { query: { page: 1, pageSize: 25, rolloutStatus: 'PHASE_1_COMPARISON' } } };
    await listKitchens(db)(req as unknown as Request, res, () => {});

    assert.deepEqual(where, { code: { in: ['LWG'] } });
    assert.equal(body.data[0].rolloutStatus, 'PHASE_1_COMPARISON');
  });
});
