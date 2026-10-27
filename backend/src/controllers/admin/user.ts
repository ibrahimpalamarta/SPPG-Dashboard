import type { Request, RequestHandler, Response } from 'express';
import type { z } from 'zod';
import { Prisma, Role } from '@prisma/client';
import { prisma, type Db } from '../../db.js';
import { sendError } from '../../middleware/error-handler.js';
import { sendJson } from '../../lib/serialize.js';
import { pageArgs, paginated } from '../../lib/pagination.js';
import { dateFilter } from '../../schemas/common.js';
import { writeAuditLog } from '../../auth/audit.js';
import { withoutSecrets, type AppUser } from '../../auth/user.js';
import { issueResetToken } from '../../auth/reset.js';
import { mayManageRole } from '../../auth/escalation.js';
import { permissionsFor, setRolePermissions } from '../../auth/rbac-store.js';
import { listSessions, revokeUserSessions } from '../../auth/session.js';
import { KITCHEN_SCOPED_ROLES, ROLES } from '../../auth/roles.js';
import { env } from '../../config/env.js';
import { renderMail } from '../../lib/mail-template.js';
import { sendMail, type SendMail } from '../../lib/mailer.js';
import type {
  auditLogListQuery,
  roleParam,
  rolePermissionsBody,
  userCreate,
  userListQuery,
  userUpdate,
} from '../../schemas/user.js';

const withScope = {
  kitchenScopes: { select: { kitchen: { select: { id: true, code: true, name: true } } } },
} satisfies Prisma.UserInclude;

const INVITE_TTL_MINUTES = () => env.INVITE_TTL_HOURS * 60;

/**
 * Emails the activation link through SES. False when mail is not configured or
 * SES fails, so the admin still gets the link in the response to hand over.
 */
async function sendInvite(send: SendMail, to: string | null, token: string, message?: string): Promise<boolean> {
  if (!to || !env.EMAIL_FROM || !env.ADMIN_BASE_URL) return false;
  const link = `${env.ADMIN_BASE_URL.replace(/\/$/, '')}/aktivasi/${token}`;
  try {
    const mail = renderMail({
      title: 'Anda diundang ke SPPG Internal',
      intro: 'Buat kata sandi untuk mengaktifkan akun Anda.',
      quote: message,
      button: { label: 'Buat kata sandi', url: link },
      note: `Tautan berlaku ${env.INVITE_TTL_HOURS} jam dan hanya bisa dipakai sekali.`,
    });
    await send(to, 'Undangan SPPG Internal', mail.text, mail.html);
    return true;
  } catch (err) {
    console.error('invitation email failed', { error: String(err) });
    return false;
  }
}

/**
 * SCRUM-121: member status as the Anggota page shows it, derived rather than
 * stored. An account with no password is an invitation: pending while its
 * newest link is still open, expired otherwise. Cancelling an invitation
 * deactivates the account, so it reads as INACTIVE.
 */
export type MemberStatus = 'ACTIVE' | 'PENDING' | 'EXPIRED' | 'INACTIVE';

export function memberStatus(
  u: { status: 'ACTIVE' | 'INACTIVE'; hasPassword: boolean },
  openInviteExpiresAt: Date | undefined,
  now = new Date(),
): MemberStatus {
  if (u.status === 'INACTIVE') return 'INACTIVE';
  if (u.hasPassword) return 'ACTIVE';
  return openInviteExpiresAt && openInviteExpiresAt > now ? 'PENDING' : 'EXPIRED';
}

export const listUsers = (db: Db = prisma): RequestHandler => async (req, res) => {
  const q = req.valid!.query as z.infer<typeof userListQuery>;
  const where: Prisma.UserWhereInput = {
    ...(q.role && { role: q.role }),
    ...(q.status && { status: q.status }),
    ...(q.search && {
      OR: [
        { email: { contains: q.search, mode: 'insensitive' as const } },
        { fullName: { contains: q.search, mode: 'insensitive' as const } },
      ],
    }),
  };

  const [rows, total] = await Promise.all([
    db.user.findMany({
      where,
      include: {
        ...withScope,
        passwordResetTokens: { where: { usedAt: null }, select: { expiresAt: true }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
      // passwordHash is read only to derive memberStatus and stripped below.
      omit: { mfaSecretEnc: true },
      orderBy: { createdAt: 'desc' },
      ...pageArgs(q),
    }),
    db.user.count({ where }),
  ]);

  const now = new Date();
  const members = rows.map(({ passwordHash, passwordResetTokens, ...u }) => ({
    ...u,
    memberStatus: memberStatus({ status: u.status, hasPassword: !!passwordHash }, passwordResetTokens[0]?.expiresAt, now),
  }));
  sendJson(res, paginated(members, total, q));
};

/** Every role involved must be one the actor may manage (see mayManageRole). */
async function mayManageAll(actor: AppUser, roles: Role[], db: Db): Promise<boolean> {
  for (const role of new Set(roles)) {
    if (!(await mayManageRole(actor, role, db))) return false;
  }
  return true;
}

/**
 * Invitation. Creates the account with no password and returns a one-time
 * set-password token — the only copy. The link is also emailed through SES;
 * when that is not configured (`emailed: false`) the admin hands it over.
 */
export const createUser = (db: Db = prisma, send: SendMail = sendMail): RequestHandler => async (req, res) => {
  const body = req.valid!.body as z.infer<typeof userCreate>;

  if (!(await mayManageAll(req.user!, [body.role], db))) {
    sendError(res, 'FORBIDDEN');
    return;
  }
  if (KITCHEN_SCOPED_ROLES.includes(body.role) && body.kitchenIds.length === 0) {
    sendError(res, 'VALIDATION_ERROR', {
      fields: { 'body.kitchenIds': [`required when role is ${body.role}`] },
    });
    return;
  }

  try {
    const user = await db.user.create({
      data: {
        email: body.email,
        fullName: body.fullName,
        role: body.role,
        kitchenScopes: { create: body.kitchenIds.map((kitchenId) => ({ kitchenId })) },
      },
      include: withScope,
      omit: withoutSecrets,
    });
    const invite = await issueResetToken(user.id, db, INVITE_TTL_MINUTES());
    await writeAuditLog(db, {
      userId: req.user!.id,
      action: 'user.created',
      entity: 'users',
      entityId: user.id,
      metadata: { role: body.role, kitchens: body.kitchenIds.map(String) },
    });
    const emailed = await sendInvite(send, user.email, invite.token, body.message);
    sendJson(res, { user, resetToken: invite.token, resetTokenExpiresAt: invite.expiresAt, emailed }, 201);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') {
        sendError(res, 'CONFLICT');
        return;
      }
      // kitchen_id is a real FK to kitchens; a bad id is the caller's mistake.
      if (err.code === 'P2003') {
        sendError(res, 'VALIDATION_ERROR', { fields: { 'body.kitchenIds': ['no kitchen with that id'] } });
        return;
      }
    }
    throw err;
  }
};

/**
 * Role, status, kitchen scope and display name are editable; the email is the
 * login and is not.
 *
 * Invariants enforced here rather than in the schema, because they need to see
 * the resulting row rather than just the request body:
 *
 *   1. A Super Admin cannot demote or deactivate itself. Locking the last
 *      administrator out of the backoffice needs a database round-trip to fix.
 *   2. A kitchen-scoped role (KITCHEN_SCOPED_ROLES) must end up with at least
 *      one kitchen. Without one it silently sees no data at all.
 *   3. No privilege escalation: the actor must be allowed to manage both the
 *      account's current role and the role it is being moved to.
 *   4. SCRUM-121: the last active PM MBG (SUPER_ADMIN with a password) can be
 *      neither deactivated nor demoted.
 *
 * A role change or deactivation ends the account's sessions, so it applies at
 * once. `kitchenIds` replaces the whole set (SCRUM-20). The audit row records
 * the set before and after — the NFR-03 hook for role/scope changes.
 */
export const updateUser = (db: Db = prisma): RequestHandler => async (req, res) => {
  const { id } = req.valid!.params as { id: bigint };
  const body = req.valid!.body as z.infer<typeof userUpdate>;

  const current = await db.user.findUnique({ where: { id }, include: withScope, omit: withoutSecrets });
  if (!current) {
    sendError(res, 'NOT_FOUND');
    return;
  }
  if (!(await mayManageAll(req.user!, [current.role, body.role ?? current.role], db))) {
    sendError(res, 'FORBIDDEN');
    return;
  }

  if (current.id === req.user!.id && (body.role !== undefined || body.status !== undefined)) {
    sendError(res, 'FORBIDDEN', { reason: 'cannot change own role or status' });
    return;
  }

  const nextRole = body.role ?? current.role;
  if (
    current.role === Role.SUPER_ADMIN &&
    current.status === 'ACTIVE' &&
    (nextRole !== Role.SUPER_ADMIN || body.status === 'INACTIVE') &&
    (await db.user.count({
      where: { id: { not: id }, role: Role.SUPER_ADMIN, status: 'ACTIVE', passwordHash: { not: null } },
    })) === 0
  ) {
    sendError(res, 'LAST_SUPER_ADMIN');
    return;
  }

  const currentKitchenIds = current.kitchenScopes.map((s) => s.kitchen.id);
  const nextKitchenIds = body.kitchenIds ?? currentKitchenIds;
  if (KITCHEN_SCOPED_ROLES.includes(nextRole) && nextKitchenIds.length === 0) {
    sendError(res, 'VALIDATION_ERROR', {
      fields: { 'body.kitchenIds': [`required when role is ${nextRole}`] },
    });
    return;
  }

  try {
    const row = await db.user.update({
      where: { id },
      data: {
        ...(body.fullName !== undefined && { fullName: body.fullName }),
        ...(body.role !== undefined && { role: body.role }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.kitchenIds !== undefined && {
          kitchenScopes: {
            deleteMany: {},
            create: body.kitchenIds.map((kitchenId) => ({ kitchenId })),
          },
        }),
      },
      include: withScope,
      omit: withoutSecrets,
    });

    if ((body.role !== undefined && body.role !== current.role) || body.status === 'INACTIVE') {
      await revokeUserSessions(id, db);
    }

    await writeAuditLog(db, {
      userId: req.user!.id,
      action: 'user.updated',
      entity: 'users',
      entityId: row.id,
      metadata: {
        fields: Object.keys(body),
        ...(body.role && { roleFrom: current.role, roleTo: body.role }),
        ...(body.status && { statusFrom: current.status, statusTo: body.status }),
        ...(body.kitchenIds && {
          kitchensFrom: currentKitchenIds.map(String),
          kitchensTo: body.kitchenIds.map(String),
        }),
      },
    });

    sendJson(res, row);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
      sendError(res, 'VALIDATION_ERROR', {
        fields: { 'body.kitchenIds': ['no kitchen with that id'] },
      });
      return;
    }
    throw err;
  }
};

/** Loads the target of an `/admin/users/:id/...` action and applies the escalation check. */
async function loadManageable(req: Request, res: Response, db: Db) {
  const { id } = req.valid!.params as { id: bigint };
  const target = await db.user.findUnique({ where: { id }, select: { id: true, email: true, role: true, status: true, passwordHash: true } });
  if (!target) {
    sendError(res, 'NOT_FOUND');
    return null;
  }
  if (!(await mayManageRole(req.user!, target.role, db))) {
    sendError(res, 'FORBIDDEN');
    return null;
  }
  return target;
}

/**
 * A fresh set-password link for an existing account (forgotten password). For
 * an account that never set a password this is "kirim ulang undangan": it
 * gets the invitation lifetime and its own audit action.
 */
export const createPasswordReset = (db: Db = prisma, send: SendMail = sendMail): RequestHandler => async (req, res) => {
  const target = await loadManageable(req, res, db);
  if (!target) return;
  const invite = !target.passwordHash;
  const { token, expiresAt } = await issueResetToken(target.id, db, invite ? INVITE_TTL_MINUTES() : undefined);
  await writeAuditLog(db, {
    userId: req.user!.id,
    action: invite ? 'user.invite_resent' : 'user.password_reset_issued',
    entity: 'users',
    entityId: target.id,
  });
  const emailed = invite ? await sendInvite(send, target.email, token) : false;
  sendJson(res, { resetToken: token, resetTokenExpiresAt: expiresAt, emailed });
};

/**
 * SCRUM-121: withdraw an invitation that was not accepted yet. The account never
 * had a password, so it is deleted (its links go with it) and the email can be
 * invited again from scratch.
 */
export const cancelInvite = (db: Db = prisma): RequestHandler => async (req, res) => {
  const target = await loadManageable(req, res, db);
  if (!target) return;
  if (target.passwordHash) {
    sendError(res, 'NOT_AN_INVITATION');
    return;
  }
  await db.user.delete({ where: { id: target.id } });
  await writeAuditLog(db, { userId: req.user!.id, action: 'user.invite_cancelled', entity: 'users', entityId: target.id, metadata: { email: target.email } });
  res.status(204).end();
};

export const listUserSessions = (db: Db = prisma): RequestHandler => async (req, res) => {
  const target = await loadManageable(req, res, db);
  if (!target) return;
  sendJson(res, await listSessions(target.id, db));
};

export const revokeAllUserSessions = (db: Db = prisma): RequestHandler => async (req, res) => {
  const target = await loadManageable(req, res, db);
  if (!target) return;
  const { count } = await revokeUserSessions(target.id, db);
  await writeAuditLog(db, {
    userId: req.user!.id,
    action: 'session.revoked',
    entity: 'users',
    entityId: target.id,
    metadata: { by: 'admin', count },
  });
  res.status(204).end();
};

/** For a user who lost their authenticator and their recovery codes. */
export const resetUserMfa = (db: Db = prisma): RequestHandler => async (req, res) => {
  const target = await loadManageable(req, res, db);
  if (!target) return;
  await db.$transaction([
    db.user.update({ where: { id: target.id }, data: { mfaEnabled: false, mfaSecretEnc: null } }),
    db.mfaRecoveryCode.deleteMany({ where: { userId: target.id } }),
  ]);
  await revokeUserSessions(target.id, db);
  await writeAuditLog(db, { userId: req.user!.id, action: 'user.mfa_reset', entity: 'users', entityId: target.id });
  res.status(204).end();
};

export const listRoles = (db: Db = prisma): RequestHandler => async (_req, res) => {
  const roles = await Promise.all(ROLES.map(async (role) => ({ role, permissions: await permissionsFor(role, db) })));
  sendJson(res, roles);
};

/**
 * Replace a role's permissions. SUPER_ADMIN is fixed (it cannot be locked
 * out), and a non-Super Admin may neither edit its own role nor grant a
 * permission it does not hold itself.
 */
export const updateRolePermissions = (db: Db = prisma): RequestHandler => async (req, res) => {
  const { role } = req.valid!.params as z.infer<typeof roleParam>;
  const { permissions } = req.valid!.body as z.infer<typeof rolePermissionsBody>;
  const actor = req.user!;

  if (role === Role.SUPER_ADMIN) {
    sendError(res, 'FORBIDDEN', { reason: 'super admin permissions are fixed' });
    return;
  }
  if (
    actor.role !== Role.SUPER_ADMIN &&
    (role === actor.role || permissions.some((p) => !actor.permissions.includes(p)))
  ) {
    sendError(res, 'FORBIDDEN');
    return;
  }

  const before = await permissionsFor(role, db);
  await setRolePermissions(role, permissions, db);
  await writeAuditLog(db, {
    userId: actor.id,
    action: 'role.permissions_updated',
    entity: 'role_permissions',
    metadata: { role, from: [...before], to: permissions },
  });
  sendJson(res, { role, permissions });
};

/** SCRUM-1: the audit trail, readable but never writable through the API. */
export const listAuditLogs = (db: Db = prisma): RequestHandler => async (req, res) => {
  const q = req.valid!.query as z.infer<typeof auditLogListQuery>;
  const timestamp = dateFilter(q.dateFrom, q.dateTo);
  const where: Prisma.AuditLogWhereInput = {
    ...(q.userId !== undefined && { userId: q.userId }),
    ...(q.entity && { entity: q.entity }),
    ...(q.action && { action: q.action }),
    ...(timestamp && { timestamp }),
  };

  const [rows, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      include: { user: { select: { id: true, email: true, fullName: true } } },
      orderBy: { timestamp: 'desc' },
      ...pageArgs(q),
    }),
    db.auditLog.count({ where }),
  ]);

  sendJson(res, paginated(rows, total, q));
};
