import { hash, verify } from '@node-rs/argon2';
import { z } from 'zod';

const CHAR_CLASSES = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/];

/**
 * The policy of the previous Auth0 default ("Good"), kept so existing habits hold: at least
 * 12 characters and 3 of lowercase / uppercase / digit / symbol. Length alone
 * is not enough — `supersecret123oke` is 17 characters and only two classes.
 * The upper bound keeps argon2 from hashing megabytes of attacker input.
 */
export const passwordPolicy = z
  .string()
  .min(12)
  .max(128)
  .refine((v) => CHAR_CLASSES.filter((re) => re.test(v)).length >= 3, {
    message: 'must mix at least 3 of: lowercase, uppercase, digits, symbols',
  });

// The library defaults are argon2id with OWASP's minimum parameters
// (19 MiB, t=2, p=1); the hash string carries them, so they can be raised
// later without invalidating stored hashes.
export const hashPassword = (password: string): Promise<string> => hash(password);

export async function verifyPassword(stored: string, password: string): Promise<boolean> {
  try {
    return await verify(stored, password);
  } catch {
    // A malformed stored hash must read as "wrong password", not as a 500.
    return false;
  }
}

let dummyHash: Promise<string> | undefined;

/**
 * Burn the same argon2 time for an unknown or locked account as for a real
 * one, so response time does not reveal which emails exist.
 */
export async function verifyDummy(password: string): Promise<void> {
  dummyHash ??= hashPassword('timing-equalisation-only');
  await verifyPassword(await dummyHash, password);
}
