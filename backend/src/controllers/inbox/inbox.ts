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
    // SCRUM-117: "Menunggu Review PM" — batches Data Operasional has submitted.
    perms.includes('batch:publish')
      ? db.uploadBatch.findMany({
          where: { status: 'READY', ...kitchenWhere(scope) },
          select: { id: true, publicId: true, domain: true, fileName: true, uploadDate: true, ...withKitchen },
          orderBy: { uploadDate: 'asc' },
        })
      : [],
    // Files to fix: unrecognised layouts, and batches the PM sent back with a note (errorSummary).
    perms.includes('upload:create')
      ? db.uploadBatch.findMany({
          where: { OR: [{ status: 'NEEDS_MAPPING_UPDATE' }, { status: 'NEEDS_REVIEW', errorCode: 'RETURNED' }], ...kitchenWhere(scope) },
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
    reviewTasks,
    quarantinedFiles,
    expiredInvites: expiredInvites
      .filter((u) => memberStatus({ status: 'ACTIVE', hasPassword: false }, u.passwordResetTokens[0]?.expiresAt, now) === 'EXPIRED')
      .map((u) => ({ id: u.id, email: u.email, fullName: u.fullName, role: u.role })),
  });
};
