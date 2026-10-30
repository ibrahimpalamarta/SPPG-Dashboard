import type { RequestHandler } from 'express';
import { env } from '../config/env.js';
import { prisma, type Db } from '../db.js';
import { resolveSession } from './session.js';
import { permissionsFor } from './rbac-store.js';
import type { AppUser } from './user.js';
import type { Permission, Role } from './roles.js';
import { sendError } from '../middleware/error-handler.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AppUser;
      /** Id of the session this request authenticated with. */
      sessionId?: bigint;
    }
  }
}

/**
 * Authentication: proves the caller holds a live session and loads `req.user`.
 * Says nothing about what they may do — that is requireRole/requirePermission.
 *
 * The token arrives as `Authorization: Bearer`, sent by the frontend's server
 * side; browsers never hold it. Role and permissions come from Postgres on
 * every request, so revoking a session, disabling an account or editing a role
 * takes effect immediately rather than at some token expiry.
 */
export function requireAuth(db: Db = prisma, { allowUnenrolled = false } = {}): RequestHandler {
  return async (req, res, next) => {
    const header = req.headers.authorization;
    if (typeof header !== 'string' || !header.startsWith('Bearer ')) {
      sendError(res, 'MISSING_TOKEN');
      return;
    }
    try {
      const found = await resolveSession(header.slice(7).trim(), db);
      if (!found) {
        // Deliberately opaque: expired vs revoked vs disabled look identical.
        sendError(res, 'INVALID_TOKEN');
        return;
      }
      // A role that must use MFA gets a session at login (it needs one to enrol),
      // but that session opens nothing except the enrolment routes.
      if (!allowUnenrolled && env.MFA_REQUIRED_ROLES.includes(found.user.role) && !found.user.mfaEnabled) {
        sendError(res, 'MFA_ENROLLMENT_REQUIRED');
        return;
      }
      req.user = { ...found.user, permissions: await permissionsFor(found.user.role, db) };
      req.sessionId = found.sessionId;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Authorization. Separate from requireAuth on purpose: 401 means "who are
 * you?", 403 means "not you".
 *
 *   router.post('/pengeluaran', requireRole('ADMIN', 'DATA_ADMIN'), handler)
 *
 * A role is read-only on a route simply by never appearing on its allow-list.
 */
export function requireRole(...allowed: Role[]): RequestHandler {
  return (req, res, next) => {
    if (!req.user) {
      sendError(res, 'INVALID_TOKEN');
      return;
    }
    if (!allowed.includes(req.user.role)) {
      sendError(res, 'FORBIDDEN');
      return;
    }
    next();
  };
}

/** SCRUM-20: same as requireRole, against the role's permissions instead of a list. */
export function requirePermission(perm: Permission): RequestHandler {
  return (req, res, next) => {
    if (!req.user) {
      sendError(res, 'INVALID_TOKEN');
      return;
    }
    if (!req.user.permissions.includes(perm)) {
      sendError(res, 'FORBIDDEN');
      return;
    }
    next();
  };
}

/**
 * The dapur a caller may touch.
 *
 * @returns null when unrestricted (ADMIN). Data Operasional gets its own
 * dapur; with no scope rows that is `[]` — it sees nothing, never everything.
 */
export function resolveKitchenIds(user: AppUser): bigint[] | null {
  return user.role === 'ADMIN' ? null : user.kitchenScopes.map((s) => s.kitchenId);
}
