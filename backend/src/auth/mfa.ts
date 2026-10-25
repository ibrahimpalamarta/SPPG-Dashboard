import { generateSecret, generateURI, verify } from 'otplib';
import { randomBytes } from 'node:crypto';
import type { Db } from '../db.js';
import { decrypt, encrypt, sha256 } from '../lib/crypto.js';

const ISSUER = 'SPPG Dashboard';
const RECOVERY_CODE_COUNT = 10;

/** A fresh authenticator secret, plus the encrypted form to store. */
export function newTotpSecret(email: string) {
  const secret = generateSecret();
  return { secret, encrypted: encrypt(secret), otpauthUrl: generateURI({ issuer: ISSUER, label: email, secret }) };
}

/** ±1 time step (30 s) of tolerance for clock drift. */
export async function checkTotp(secretEnc: string, code: string): Promise<boolean> {
  const result = await verify({ secret: decrypt(secretEnc), token: code, epochTolerance: 30 });
  return result.valid;
}

/** `xxxx-xxxx-xxxx-xxxx`, 64 bits: enough that a plain SHA-256 at rest is fine. */
export function newRecoveryCodes() {
  const plain = Array.from({ length: RECOVERY_CODE_COUNT }, () =>
    randomBytes(8).toString('hex').match(/.{4}/g)!.join('-'),
  );
  return { plain, hashes: plain.map(sha256) };
}

/** Marks the code used and returns true, only if it exists and is still unused. */
export async function consumeRecoveryCode(userId: bigint, code: string, db: Db): Promise<boolean> {
  const { count } = await db.mfaRecoveryCode.updateMany({
    where: { userId, codeHash: sha256(code.trim().toLowerCase()), usedAt: null },
    data: { usedAt: new Date() },
  });
  return count === 1;
}

/** 6 digits is a TOTP; anything else is tried as a recovery code. */
export const isTotpShaped = (code: string): boolean => /^\d{6}$/.test(code);
