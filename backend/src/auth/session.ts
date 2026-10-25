import { env } from '../config/env.js';
import type { Db } from '../db.js';
import { randomToken, sha256 } from '../lib/crypto.js';
import { withKitchenScopes, withoutSecrets } from './user.js';

const MIN = 60_000;
/** `lastSeenAt` is only rewritten when it is this stale — one write per minute, not per request. */
const TOUCH_AFTER_MS = MIN;

export interface SessionMeta {
  ip?: string;
  userAgent?: string;
}

/**
 * Opens a session and returns the raw token. This is the only moment the raw
 * value exists server-side; the row keeps its SHA-256, so a database dump
 * cannot be replayed as cookies.
 */
export async function createSession(userId: bigint, meta: SessionMeta, db: Db, now = Date.now()) {
  const token = randomToken();
  const expiresAt = new Date(now + env.SESSION_ABSOLUTE_HOURS * 60 * MIN);
  await db.session.create({
    data: {
      userId,
      tokenHash: sha256(token),
      expiresAt,
      ip: meta.ip?.slice(0, 64),
      userAgent: meta.userAgent?.slice(0, 256),
    },
  });
  return { token, expiresAt };
}

/**
 * The session behind a bearer token, or null for every way it can be dead:
 * unknown, revoked, past the absolute cap, idle too long, or the account
 * disabled since. Callers must not distinguish between them.
 */
export async function resolveSession(token: string, db: Db, now = Date.now()) {
  const session = await db.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: { include: withKitchenScopes, omit: withoutSecrets } },
  });
  if (!session || session.revokedAt) return null;
  if (session.expiresAt.getTime() <= now) return null;
  if (now - session.lastSeenAt.getTime() > env.SESSION_IDLE_MINUTES * MIN) return null;
  if (session.user.status !== 'ACTIVE') return null;

  if (now - session.lastSeenAt.getTime() > TOUCH_AFTER_MS) {
    await db.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date(now) } });
  }
  return { sessionId: session.id, user: session.user };
}

export const revokeSession = (userId: bigint, sessionId: bigint, db: Db) =>
  db.session.updateMany({ where: { id: sessionId, userId, revokedAt: null }, data: { revokedAt: new Date() } });

/** Log a user out everywhere, optionally sparing the session making the request. */
export const revokeUserSessions = (userId: bigint, db: Db, exceptSessionId?: bigint) =>
  db.session.updateMany({
    where: { userId, revokedAt: null, ...(exceptSessionId !== undefined && { id: { not: exceptSessionId } }) },
    data: { revokedAt: new Date() },
  });

/** Live sessions only. `tokenHash` is deliberately not selectable here. */
export const listSessions = (userId: bigint, db: Db, now = Date.now()) =>
  db.session.findMany({
    where: {
      userId,
      revokedAt: null,
      expiresAt: { gt: new Date(now) },
      lastSeenAt: { gt: new Date(now - env.SESSION_IDLE_MINUTES * MIN) },
    },
    select: { id: true, createdAt: true, lastSeenAt: true, expiresAt: true, ip: true, userAgent: true },
    orderBy: { lastSeenAt: 'desc' },
  });
