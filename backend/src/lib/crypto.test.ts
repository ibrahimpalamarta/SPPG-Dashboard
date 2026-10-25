import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { decrypt, encrypt, randomToken, sha256, signChallenge, verifyChallenge } from './crypto.js';

describe('encrypt / decrypt', () => {
  test('round-trips and does not leave the plaintext in the ciphertext', () => {
    const packed = encrypt('JBSWY3DPEHPK3PXP');
    assert.equal(decrypt(packed), 'JBSWY3DPEHPK3PXP');
    assert.ok(!packed.includes('JBSWY3DPEHPK3PXP'));
  });

  test('a fresh IV makes every ciphertext different', () => {
    assert.notEqual(encrypt('same'), encrypt('same'));
  });

  test('tampering is detected, not decrypted to garbage', () => {
    const [iv, tag, data] = encrypt('secret').split('.');
    const flipped = Buffer.from(data!, 'base64url');
    flipped[0] = flipped[0]! ^ 1;
    assert.throws(() => decrypt([iv, tag, flipped.toString('base64url')].join('.')));
  });
});

describe('tokens', () => {
  test('are long, unique, and hash to a stable 64-char digest', () => {
    const [a, b] = [randomToken(), randomToken()];
    assert.notEqual(a, b);
    assert.ok(a.length >= 43);
    assert.equal(sha256(a), sha256(a));
    assert.equal(sha256(a).length, 64);
  });
});

describe('MFA challenge', () => {
  test('verifies for the user it was issued to', () => {
    assert.equal(verifyChallenge(signChallenge(42n, 60_000)), 42n);
  });

  test('expires', () => {
    assert.equal(verifyChallenge(signChallenge(42n, 60_000, 1_000), 1_000 + 60_001), null);
  });

  test('rejects forged, truncated and garbage input', () => {
    const good = signChallenge(42n, 60_000);
    for (const bad of [`${good}0`, good.slice(0, -2), 'x', '', '1.2.3', '..']) {
      assert.equal(verifyChallenge(bad), null, bad);
    }
  });
});
