import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Prisma } from '@prisma/client';
import { serialize } from './serialize.js';

describe('serialize', () => {
  test('turns BigInt into a string so res.json does not throw', () => {
    assert.equal(serialize(9007199254740993n), '9007199254740993');
    // Why a string and not a number: this id is past Number.MAX_SAFE_INTEGER,
    // so going through a JSON number would silently round it.
    assert.notEqual(String(Number('9007199254740993')), '9007199254740993');
  });

  test('turns Prisma Decimal into a number', () => {
    assert.equal(serialize(new Prisma.Decimal('1234.56')), 1234.56);
    assert.equal(serialize(new Prisma.Decimal('0')), 0);
  });

  test('turns Date into an ISO string', () => {
    assert.equal(serialize(new Date('2026-08-19T00:00:00.000Z')), '2026-08-19T00:00:00.000Z');
  });

  test('walks nested objects and arrays', () => {
    const row = {
      id: 1n,
      kitchen: { id: 2n, name: 'Sukun' },
      rows: [{ energi: new Prisma.Decimal('10.5') }, { energi: null }],
      tanggal: new Date('2026-08-19T00:00:00.000Z'),
    };

    assert.deepEqual(serialize(row), {
      id: '1',
      kitchen: { id: '2', name: 'Sukun' },
      rows: [{ energi: 10.5 }, { energi: null }],
      tanggal: '2026-08-19T00:00:00.000Z',
    });
  });

  test('leaves null, undefined and primitives alone', () => {
    assert.equal(serialize(null), null);
    assert.equal(serialize(undefined), undefined);
    assert.equal(serialize('Donomulyo'), 'Donomulyo');
    assert.equal(serialize(42), 42);
    assert.equal(serialize(false), false);
  });

  test('produces something JSON.stringify can actually handle', () => {
    // The regression this guards: res.json({ id: 1n }) throws at runtime.
    assert.doesNotThrow(() => JSON.stringify(serialize({ id: 1n })));
  });
});
