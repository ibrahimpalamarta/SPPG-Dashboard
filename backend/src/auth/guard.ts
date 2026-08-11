import type { RequestHandler } from 'express';
import type { User } from '@prisma/client';
import { prisma, type Db } from '../db.js';
import { findOrCreateUser } from './user-sync.js';
import type { Role } from './roles.js';

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
      res.status(401).json({ error: 'unauthorized', message: 'Invalid or expired token' });
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
      res.status(401).json({ error: 'unauthorized', message: 'Invalid or expired token' });
      return;
    }
    if (!allowed.includes(req.user.role)) {
      res.status(403).json({ error: 'forbidden', message: 'Insufficient role' });
      return;
    }
    next();
  };
}

/**
 * A DATA_ADMIN may only touch its own SPPG Dapur. The tables it scopes do not
 * exist yet, so this only resolves the scope; call it from feature routes next
 * phase to get the `scope_id` to filter by.
 *
 * @returns null when the caller is unrestricted (SUPER_ADMIN).
 */
export function resolveScopeId(user: User): string | null {
  return user.role === 'SUPER_ADMIN' ? null : user.scopeId;
}
