import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { withoutBlanks } from './env.js';

describe('withoutBlanks', () => {
  test('drops keys set to an empty string', () => {
    assert.deepEqual(withoutBlanks({ A: 'x', B: '' }), { A: 'x' });
  });

  test('keeps whitespace and "0" — only truly empty is unset', () => {
    assert.deepEqual(withoutBlanks({ A: ' ', B: '0', C: 'false' }), { A: ' ', B: '0', C: 'false' });
  });

  test('SEED_SUPERADMIN_PASSWORD= reads as "generate one", not as a short password', () => {
    // The seed script's schema. `KEY=` in a .env file arrives as "", which
    // .optional() rejects — hence the strip.
    const schema = z.object({ SEED_SUPERADMIN_PASSWORD: z.string().min(12).optional() });

    assert.throws(() => schema.parse({ SEED_SUPERADMIN_PASSWORD: '' }));
    assert.deepEqual(schema.parse(withoutBlanks({ SEED_SUPERADMIN_PASSWORD: '' })), {});
  });

  test('a blank password is still rejected when it is a real short value', () => {
    const schema = z.object({ SEED_SUPERADMIN_PASSWORD: z.string().min(12).optional() });
    assert.throws(() => schema.parse(withoutBlanks({ SEED_SUPERADMIN_PASSWORD: 'short' })));
  });

  test('blank numeric vars fall back to their default instead of coercing to 0', () => {
    const schema = z.object({ DB_PORT: z.coerce.number().int().positive().default(5432) });

    assert.throws(() => schema.parse({ DB_PORT: '' }), 'blank would coerce to 0');
    assert.equal(schema.parse(withoutBlanks({ DB_PORT: '' })).DB_PORT, 5432);
  });
});
