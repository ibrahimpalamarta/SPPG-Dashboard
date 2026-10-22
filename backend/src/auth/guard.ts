import type { RequestHandler } from 'express';
import { prisma, type Db } from '../db.js';
import { findOrCreateUser, type AppUser } from './user-sync.js';
import { hasPermission, type Permission, type Role } from './roles.js';
import { sendError } from '../middleware/error-handler.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AppUser;
    }
  }
}

/**
 * Turns an authenticated token into `req.user`, provisioning the row on first
 * sight. Mount after requireAuth and before any requireRole/requirePermission.
 */
export function attachUser(db: Db = prisma): RequestHandler {
  return async (req, res, next) => {
    if (!req.auth) {
      sendError(res, 'INVALID_TOKEN');
      return;
    }
    try {
      req.user = await findOrCreateUser(req.auth, db);
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
 * Reads the role off `req.user` (Postgres), never off the raw token.
 *
 *   router.post('/pengeluaran', requireAuth(), attachUser(), requireRole('SUPER_ADMIN', 'DATA_ADMIN'), handler)
 *
 * INTERNAL and PUBLIC are read-only simply by never appearing on a mutating
 * route's allow-list.
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

/** SCRUM-20: same as requireRole, against ROLE_PERMISSIONS instead of a list. */
export function requirePermission(perm: Permission): RequestHandler {
  return (req, res, next) => {
    if (!req.user) {
      sendError(res, 'INVALID_TOKEN');
      return;
    }
    if (!hasPermission(req.user.role, perm)) {
      sendError(res, 'FORBIDDEN');
      return;
    }
    next();
  };
}

/**
 * The dapur a caller may touch.
 *
 * @returns null when unrestricted: SUPER_ADMIN always, and any other role that
 * has no scope rows. A DATA_ADMIN with no rows gets `[]` — it sees nothing,
 * never everything.
 */
export function resolveKitchenIds(user: AppUser): bigint[] | null {
  if (user.role === 'SUPER_ADMIN') return null;
  const ids = user.kitchenScopes.map((s) => s.kitchenId);
  return ids.length === 0 && user.role !== 'DATA_ADMIN' ? null : ids;
}
