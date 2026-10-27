import { env } from '../config/env.js';
import type { Db } from '../db.js';
import { randomToken, sha256 } from '../lib/crypto.js';

/**
 * Mint a one-time set/reset-password token, voiding any older one. Returns the
 * raw token — the only copy there will ever be; the row keeps its SHA-256.
 * Used for both invitations and resets, since an invited account is just one
 * with no password yet; an invitation passes the longer INVITE_TTL_HOURS.
 */
export async function issueResetToken(userId: bigint, db: Db, ttlMinutes = env.PASSWORD_RESET_TTL_MINUTES, now = Date.now()) {
  const token = randomToken();
  const expiresAt = new Date(now + ttlMinutes * 60_000);
  await db.$transaction([
    db.passwordResetToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt: new Date(now) } }),
    db.passwordResetToken.create({ data: { userId, tokenHash: sha256(token), expiresAt } }),
  ]);
  return { token, expiresAt };
}
