import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, passwordPolicy, verifyDummy, verifyPassword } from './password.js';

describe('passwordPolicy', () => {
  test('rejects a long password that only uses two character classes', () => {
    // 17 chars, lowercase + digits.
    assert.throws(() => passwordPolicy.parse('supersecret123oke'));
    assert.throws(() => passwordPolicy.parse('SUPERSECRET123OKE'));
  });

  test('rejects a short password even with every class present', () => {
    assert.throws(() => passwordPolicy.parse('Ab1!xy'));
  });

  test('accepts 12+ chars with three classes', () => {
    assert.equal(passwordPolicy.parse('Supersecret123oke'), 'Supersecret123oke');
    assert.equal(passwordPolicy.parse('supersecret123!!!'), 'supersecret123!!!');
  });

  test('caps the length so argon2 is not fed megabytes', () => {
    assert.throws(() => passwordPolicy.parse(`${'a'.repeat(200)}A1!`));
  });

  test('says what is wrong, not just that it is wrong', () => {
    const result = passwordPolicy.safeParse('supersecret123oke');
    assert.equal(result.success, false);
    assert.match(result.error!.issues[0]!.message, /lowercase, uppercase, digits, symbols/);
  });
});

describe('hashPassword / verifyPassword', () => {
  test('hashes with argon2id and verifies only the right password', async () => {
    const stored = await hashPassword('Correct-Horse-9');
    assert.match(stored, /^\$argon2id\$/);
    assert.equal(await verifyPassword(stored, 'Correct-Horse-9'), true);
    assert.equal(await verifyPassword(stored, 'Correct-Horse-8'), false);
  });

  test('never stores the password and salts every hash', async () => {
    const [a, b] = await Promise.all([hashPassword('Same-Password-1'), hashPassword('Same-Password-1')]);
    assert.notEqual(a, b);
    assert.ok(!a.includes('Same-Password-1'));
  });

  test('a corrupt stored hash reads as "wrong password", not as an error', async () => {
    assert.equal(await verifyPassword('not-a-hash', 'whatever'), false);
  });

  test('verifyDummy resolves without throwing', async () => {
    await assert.doesNotReject(verifyDummy('anything'));
  });
});
