import type { RequestHandler } from 'express';
import { prisma, type Db } from '../../db.js';
import { sendJson } from '../../lib/serialize.js';
import { kitchenScope, kitchenWhere } from '../../lib/scope.js';
import { memberStatus } from '../admin/user.js';

const withKitchen = { kitchen: { select: { id: true, code: true, name: true } } } as const;

/**
 * Inbox: expired invitations (Admin), files to fix (Data Operasional). No new
 * workflow — this only surfaces upload_batch/user rows that already exist
 * (SCRUM-21, SCRUM-139, FR-MEM-07), narrowed to what the caller's permissions
 * and kitchen scope allow. SCRUM-148: there are no review tasks any more.
 */
export const getInbox = (db: Db = prisma): RequestHandler => async (req, res) => {
  const user = req.user!;
  const perms = user.permissions;
  const scope = kitchenScope(user);
  if (!scope.ok) return; // kitchenScope(user) with no `requested` id is always ok

  const [quarantinedFiles, expiredInvites] = await Promise.all([
    // Files to fix: unrecognised layouts.
    perms.includes('upload:create')
      ? db.uploadBatch.findMany({
          where: { status: 'NEEDS_MAPPING_UPDATE', ...kitchenWhere(scope) },
          select: { id: true, publicId: true, domain: true, fileName: true, uploadDate: true, status: true, errorSummary: true, notes: true, ...withKitchen },
          orderBy: { uploadDate: 'asc' },
        })
      : [],
    perms.includes('users:manage')
      ? db.user.findMany({
          where: { status: 'ACTIVE', passwordHash: null },
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            passwordResetTokens: { where: { usedAt: null }, select: { expiresAt: true }, orderBy: { createdAt: 'desc' }, take: 1 },
          },
        })
      : [],
  ]);

  const now = new Date();
  sendJson(res, {
    quarantinedFiles,
    expiredInvites: expiredInvites
      .filter((u) => memberStatus({ status: 'ACTIVE', hasPassword: false }, u.passwordResetTokens[0]?.expiresAt, now) === 'EXPIRED')
      .map((u) => ({ id: u.id, email: u.email, fullName: u.fullName, role: u.role })),
  });
};
