import type { RequestHandler } from 'express';
import { prisma, type Db } from '../../db.js';
import { sendJson } from '../../lib/serialize.js';
import { kitchenScope, kitchenWhere } from '../../lib/scope.js';
import { memberStatus } from '../admin/user.js';

const withKitchen = { kitchen: { select: { id: true, code: true, name: true } } } as const;

/**
 * PRD §Inbox & Anggota: "Inbox: tugas review dan undangan kedaluwarsa (PM
 * MBG), tindak lanjut catatan/issue (Data Operasional)." No new workflow —
 * this only surfaces upload_batch/user rows that already exist (SCRUM-21,
 * SCRUM-117, SCRUM-139, FR-MEM-07), narrowed to whichever of the three the
 * caller's permissions and kitchen scope allow.
 */
export const getInbox = (db: Db = prisma): RequestHandler => async (req, res) => {
  const user = req.user!;
  const perms = user.permissions;
  const scope = kitchenScope(user);
  if (!scope.ok) return; // kitchenScope(user) with no `requested` id is always ok

  const [reviewTasks, quarantinedFiles, expiredInvites] = await Promise.all([
    perms.includes('batch:review')
      ? db.uploadBatch.findMany({
          where: { status: 'NEEDS_REVIEW', ...kitchenWhere(scope) },
          select: { id: true, publicId: true, domain: true, fileName: true, uploadDate: true, ...withKitchen },
          orderBy: { uploadDate: 'asc' },
        })
      : [],
    perms.includes('upload:create')
      ? db.uploadBatch.findMany({
          where: { status: 'NEEDS_MAPPING_UPDATE', ...kitchenWhere(scope) },
          select: { id: true, publicId: true, domain: true, fileName: true, uploadDate: true, errorSummary: true, notes: true, ...withKitchen },
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
    reviewTasks,
    quarantinedFiles,
    expiredInvites: expiredInvites
      .filter((u) => memberStatus({ status: 'ACTIVE', hasPassword: false }, u.passwordResetTokens[0]?.expiresAt, now) === 'EXPIRED')
      .map((u) => ({ id: u.id, email: u.email, fullName: u.fullName, role: u.role })),
  });
};
