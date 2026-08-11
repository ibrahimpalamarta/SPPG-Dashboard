import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { auth0Domain, auth0Password, withoutBlanks } from './env.js';

describe('auth0Password', () => {
  test('rejects a long password that only uses two character classes', () => {
    // 17 chars, lowercase + digits. Auth0 calls this PasswordStrengthError.
    assert.throws(() => auth0Password.parse('supersecret123oke'));
    assert.throws(() => auth0Password.parse('SUPERSECRET123OKE'));
  });

  test('rejects a short password even with every class present', () => {
    assert.throws(() => auth0Password.parse('Ab1!xy'));
  });

  test('accepts 12+ chars with three classes', () => {
    assert.equal(auth0Password.parse('Supersecret123oke'), 'Supersecret123oke');
    assert.equal(auth0Password.parse('supersecret123!!!'), 'supersecret123!!!');
  });

  test('the generated password shape satisfies the policy', () => {
    // Mirrors generatePassword() in scripts/seed-superadmin.ts.
    assert.doesNotThrow(() => auth0Password.parse(`${'x'.repeat(32)}aA1!`));
  });

  test('says what is wrong, not just that it is wrong', () => {
    const result = auth0Password.safeParse('supersecret123oke');
    assert.equal(result.success, false);
    assert.match(result.error!.issues[0]!.message, /lowercase, uppercase, digits, symbols/);
  });
});

describe('auth0Domain', () => {
  const host = 'dev-abc123.us.auth0.com';

  test('normalises every form people paste into the bare host', () => {
    for (const input of [
      host,
      `https://${host}`,
      `https://${host}/`,
      `https://${host}/api/v2/`, // the Management API audience
    ]) {
      assert.equal(auth0Domain.parse(input), host, input);
    }
  });

  test('rejects a value that is nothing but a scheme', () => {
    assert.throws(() => auth0Domain.parse('https://'));
  });
});

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
