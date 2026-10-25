import type { RequestHandler } from 'express';
import { prisma, type Db } from '../../db.js';
import { sendJson } from '../../lib/serialize.js';
import { resolveKitchenIds } from '../../auth/guard.js';
import { env } from '../../config/env.js';

/**
 * SCRUM-20/21: everything the app shell needs to draw itself — which menus to
 * show (`permissions`) and which dapur go in the kitchen selector (`kitchens`).
 * The server still enforces both on every request; this is display only.
 */
export const getMe = (db: Db = prisma): RequestHandler => async (req, res) => {
  const u = req.user!;
  const ids = resolveKitchenIds(u);
  const kitchens = await db.kitchen.findMany({
    where: ids === null ? {} : { id: { in: ids } },
    select: { id: true, code: true, name: true },
    orderBy: { name: 'asc' },
  });

  sendJson(res, {
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    role: u.role,
    permissions: u.permissions,
    mfaEnabled: u.mfaEnabled,
    mfaEnrollmentRequired: env.MFA_REQUIRED_ROLES.includes(u.role) && !u.mfaEnabled,
    kitchens,
  });
};
