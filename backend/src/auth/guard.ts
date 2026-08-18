import type { RequestHandler } from 'express';
import type { User } from '@prisma/client';
import { prisma, type Db } from '../db.js';
import { findOrCreateUser } from './user-sync.js';
import type { Role } from './roles.js';
import { sendError } from '../middleware/error-handler.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

/**
 * Turns an authenticated token into `req.user`, provisioning the row on first
 * sight. Mount after requireAuth and before any requireRole.
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
 * Reads the role off `req.user` (Postgres), never off the raw token, so a
 * revoked role takes effect on the next login rather than on token expiry.
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

/**
 * A DATA_ADMIN may only touch its own SPPG Dapur. `scope_id` is now a real FK
 * to `kitchens`, so this value can be used directly to filter feature queries.
 *
 * @returns null when the caller is unrestricted (SUPER_ADMIN).
 */
export function resolveScopeId(user: User): bigint | null {
  return user.role === 'SUPER_ADMIN' ? null : user.scopeId;
}
