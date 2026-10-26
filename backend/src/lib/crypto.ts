import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';

const key = () => Buffer.from(env.MFA_ENCRYPTION_KEY, 'base64');

/** Pinned so a truncated tag is rejected instead of weakening GCM forgery resistance. */
const TAG_LENGTH = 16;

/** Unguessable URL-safe token: 256 bits, so a hash of it needs no salt. */
export const randomToken = (): string => randomBytes(32).toString('base64url');

/** What gets stored for a bearer-style token; the raw value never touches the DB. */
export const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

/** AES-256-GCM, packed as `iv.tag.ciphertext` (base64url). */
export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv, { authTagLength: TAG_LENGTH });
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString('base64url')).join('.');
}

export function decrypt(packed: string): string {
  const [iv, tag, data] = packed.split('.').map((p) => Buffer.from(p, 'base64url'));
  if (!iv || !tag || !data) throw new Error('malformed ciphertext');
  const decipher = createDecipheriv('aes-256-gcm', key(), iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

const sign = (payload: string): string =>
  createHmac('sha256', key()).update(`mfa-challenge:${payload}`).digest('base64url');

/**
 * Short-lived proof that the password step succeeded, handed back while the
 * client collects the MFA code. Stateless on purpose: it is useless without a
 * valid TOTP or recovery code, and it expires in minutes.
 */
export function signChallenge(userId: bigint, ttlMs: number, now = Date.now()): string {
  const payload = `${userId}.${now + ttlMs}`;
  return `${payload}.${sign(payload)}`;
}

/** @returns the user id, or null for anything forged, malformed or expired. */
export function verifyChallenge(token: string, now = Date.now()): bigint | null {
  const [id, exp, mac] = token.split('.');
  if (!id || !exp || !mac || !/^\d+$/.test(id) || !/^\d+$/.test(exp)) return null;
  const expected = Buffer.from(sign(`${id}.${exp}`));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return Number(exp) > now ? BigInt(id) : null;
}
