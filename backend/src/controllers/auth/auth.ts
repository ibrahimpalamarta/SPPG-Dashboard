import type { Request, RequestHandler } from 'express';
import type { z } from 'zod';
import { env } from '../../config/env.js';
import { prisma, type Db } from '../../db.js';
import { sendError } from '../../middleware/error-handler.js';
import { sendJson } from '../../lib/serialize.js';
import { sha256, signChallenge, verifyChallenge } from '../../lib/crypto.js';
import { hashPassword, verifyDummy, verifyPassword } from '../../auth/password.js';
import { createSession, listSessions, revokeSession, revokeUserSessions } from '../../auth/session.js';
import { checkTotp, consumeRecoveryCode, isTotpShaped, newRecoveryCodes, newTotpSecret } from '../../auth/mfa.js';
import { writeAuditLog } from '../../auth/audit.js';
import { issueResetToken } from '../../auth/reset.js';
import { renderMail } from '../../lib/mail-template.js';
import { sendMail, type SendMail } from '../../lib/mailer.js';
import type {
  changePasswordBody,
  forgotPasswordBody,
  invitationParam,
  loginBody,
  mfaDisableBody,
  mfaEnableBody,
  mfaVerifyBody,
  resetPasswordBody,
} from '../../schemas/auth.js';

const MIN = 60_000;
const CHALLENGE_TTL_MS = 5 * MIN;

type Credentialed = NonNullable<Awaited<ReturnType<Db['user']['findUnique']>>>;

const audit = (db: Db, req: Request, userId: bigint | null, action: string, metadata: Record<string, unknown> = {}) =>
  writeAuditLog(db, {
    userId,
    action,
    entity: 'users',
    entityId: userId,
    metadata: { ip: req.ip ?? null, ...metadata },
  });

/** The account may log in at all: enabled, has a password, not in lockout. */
const canAttempt = (u: Credentialed | null, now: number): u is Credentialed & { passwordHash: string } =>
  !!u && u.status === 'ACTIVE' && !!u.passwordHash && !(u.lockedUntil && u.lockedUntil.getTime() > now);

/**
 * Count a failed password / MFA attempt and lock the account once the budget
 * is spent. Atomic increment, so parallel guesses cannot each read the same
 * count and slip past the limit.
 */
async function recordFailure(user: Credentialed, db: Db): Promise<void> {
  const { failedLoginCount } = await db.user.update({
    where: { id: user.id },
    data: { failedLoginCount: { increment: 1 } },
    select: { failedLoginCount: true },
  });
  if (failedLoginCount >= env.LOGIN_MAX_FAILURES) {
    await db.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: new Date(Date.now() + env.LOGIN_LOCK_MINUTES * MIN) },
    });
  }
}

async function startSession(user: Credentialed, req: Request, db: Db): Promise<{
  token: string;
  expiresAt: Date;
  mfaEnrollmentRequired: boolean;
}> {
  const session = await createSession(user.id, { ip: req.ip, userAgent: req.get('user-agent') }, db);
  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date(), failedLoginCount: 0, lockedUntil: null },
  });
  await audit(db, req, user.id, 'auth.login.success');
  return { ...session, mfaEnrollmentRequired: env.MFA_REQUIRED_ROLES.includes(user.role) && !user.mfaEnabled };
}

export const login = (db: Db = prisma): RequestHandler => async (req, res) => {
  const { email, password } = req.valid!.body as z.infer<typeof loginBody>;
  const now = Date.now();
  const user = await db.user.findUnique({ where: { email } });

  if (!canAttempt(user, now)) {
    await verifyDummy(password);
    await audit(db, req, user?.id ?? null, 'auth.login.failed', {
      reason: !user ? 'unknown_email' : user.status !== 'ACTIVE' ? 'inactive' : !user.passwordHash ? 'no_password' : 'locked',
    });
    sendError(res, 'INVALID_CREDENTIALS');
    return;
  }

  if (!(await verifyPassword(user.passwordHash, password))) {
    await recordFailure(user, db);
    await audit(db, req, user.id, 'auth.login.failed', { reason: 'bad_password' });
    sendError(res, 'INVALID_CREDENTIALS');
    return;
  }

  if (user.mfaEnabled) {
    sendJson(res, { status: 'mfa_required', mfaToken: signChallenge(user.id, CHALLENGE_TTL_MS) });
    return;
  }
  sendJson(res, { status: 'ok', ...(await startSession(user, req, db)) });
};

export const verifyMfa = (db: Db = prisma): RequestHandler => async (req, res) => {
  const { mfaToken, code } = req.valid!.body as z.infer<typeof mfaVerifyBody>;
  const userId = verifyChallenge(mfaToken);
  const user = userId === null ? null : await db.user.findUnique({ where: { id: userId } });

  if (!canAttempt(user, Date.now()) || !user.mfaEnabled || !user.mfaSecretEnc) {
    sendError(res, 'INVALID_MFA_CODE');
    return;
  }

  const ok = isTotpShaped(code)
    ? await checkTotp(user.mfaSecretEnc, code)
    : await consumeRecoveryCode(user.id, code, db);
  if (!ok) {
    await recordFailure(user, db);
    await audit(db, req, user.id, 'auth.mfa.failed');
    sendError(res, 'INVALID_MFA_CODE');
    return;
  }
  if (!isTotpShaped(code)) await audit(db, req, user.id, 'auth.mfa.recovery_code_used');
  sendJson(res, { status: 'ok', ...(await startSession(user, req, db)) });
};

export const logout = (db: Db = prisma): RequestHandler => async (req, res) => {
  await revokeSession(req.user!.id, req.sessionId!, db);
  await audit(db, req, req.user!.id, 'auth.logout');
  res.status(204).end();
};

/**
 * SCRUM-122: what the activation page shows before the password is chosen.
 * Only an open invitation answers: a used, expired or cancelled link, or one
 * for an account that already has a password, gets the same refusal.
 */
export const getInvitation = (db: Db = prisma): RequestHandler => async (req, res) => {
  const { token } = req.valid!.params as z.infer<typeof invitationParam>;
  const row = await db.passwordResetToken.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: { select: { email: true, fullName: true, role: true, status: true, passwordHash: true } } },
  });
  if (!row || row.usedAt || row.expiresAt <= new Date() || row.user.status !== 'ACTIVE' || row.user.passwordHash) {
    sendError(res, 'INVALID_RESET_TOKEN');
    return;
  }
  sendJson(res, { email: row.user.email, fullName: row.user.fullName, role: row.user.role, expiresAt: row.expiresAt });
};

/**
 * Consume a set/reset link. Single-use is enforced by the conditional UPDATE,
 * not by a read-then-write, so two parallel requests cannot both succeed.
 * Every session of the account dies with the old password.
 *
 * SCRUM-122: the first password of an invited account is its activation; that
 * answers like a login (a fresh session) so the member lands in the app.
 */
export const resetPassword = (db: Db = prisma): RequestHandler => async (req, res) => {
  const { token, password } = req.valid!.body as z.infer<typeof resetPasswordBody>;
  const now = new Date();

  const row = await db.passwordResetToken.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: { select: { id: true, status: true, passwordHash: true } } },
  });
  if (!row || row.usedAt || row.expiresAt <= now || row.user.status !== 'ACTIVE') {
    sendError(res, 'INVALID_RESET_TOKEN');
    return;
  }

  const activating = !row.user.passwordHash;
  const passwordHash = await hashPassword(password);
  const [claimed] = await db.$transaction([
    db.passwordResetToken.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: now } }),
    // Any other outstanding link for this account is void too.
    db.passwordResetToken.updateMany({ where: { userId: row.userId, usedAt: null }, data: { usedAt: now } }),
  ]);
  if (claimed.count !== 1) {
    sendError(res, 'INVALID_RESET_TOKEN');
    return;
  }
  const user = await db.user.update({
    where: { id: row.userId },
    data: { passwordHash, failedLoginCount: 0, lockedUntil: null },
  });
  await revokeUserSessions(row.userId, db);
  if (activating) {
    await audit(db, req, row.userId, 'user.activated');
    sendJson(res, { status: 'ok', ...(await startSession(user, req, db)) });
    return;
  }
  await audit(db, req, row.userId, 'auth.password.reset');
  res.status(204).end();
};

/**
 * Self-service "forgot password". Always the same 204, whether or not the
 * email belongs to an account, so it cannot be used to probe for accounts.
 * Only an active account that already has a password gets a link: a pending
 * invitation is re-sent by an admin, not by this form. The email goes out in
 * the background so response time does not tell the two cases apart.
 */
export const forgotPassword = (db: Db = prisma, send: SendMail = sendMail): RequestHandler => async (req, res) => {
  const { email } = req.valid!.body as z.infer<typeof forgotPasswordBody>;
  const user = await db.user.findUnique({ where: { email } });

  if (user?.status === 'ACTIVE' && user.passwordHash && user.email && env.EMAIL_FROM && env.ADMIN_BASE_URL) {
    const { token } = await issueResetToken(user.id, db);
    const link = `${env.ADMIN_BASE_URL.replace(/\/$/, '')}/reset-password/${token}`;
    const mail = renderMail({
      title: 'Reset kata sandi',
      intro: 'Kami menerima permintaan reset kata sandi akun SPPG Internal Anda.',
      button: { label: 'Atur kata sandi baru', url: link },
      note: `Tautan berlaku ${env.PASSWORD_RESET_TTL_MINUTES} menit dan hanya bisa dipakai sekali. Abaikan email ini jika bukan Anda yang meminta.`,
    });
    send(user.email, 'Reset kata sandi SPPG Internal', mail.text, mail.html).catch((err: unknown) =>
      console.error('forgot-password email failed', { error: String(err) }),
    );
    await audit(db, req, user.id, 'auth.password.forgot');
  }
  res.status(204).end();
};

export const changePassword = (db: Db = prisma): RequestHandler => async (req, res) => {
  const { currentPassword, newPassword } = req.valid!.body as z.infer<typeof changePasswordBody>;
  const user = await db.user.findUnique({ where: { id: req.user!.id } });

  if (!user?.passwordHash || !(await verifyPassword(user.passwordHash, currentPassword))) {
    // Same budget as login: a stolen session must not be a free password oracle.
    if (user) await recordFailure(user, db);
    sendError(res, 'INVALID_CREDENTIALS');
    return;
  }
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(newPassword) } });
  await revokeUserSessions(user.id, db, req.sessionId);
  await audit(db, req, user.id, 'auth.password.changed');
  res.status(204).end();
};

export const mySessions = (db: Db = prisma): RequestHandler => async (req, res) => {
  const rows = await listSessions(req.user!.id, db);
  sendJson(res, rows.map((s) => ({ ...s, current: s.id === req.sessionId })));
};

export const revokeMySession = (db: Db = prisma): RequestHandler => async (req, res) => {
  const { id } = req.valid!.params as { id: bigint };
  const { count } = await revokeSession(req.user!.id, id, db);
  if (count === 0) {
    sendError(res, 'NOT_FOUND');
    return;
  }
  await audit(db, req, req.user!.id, 'session.revoked', { sessionId: String(id), by: 'self' });
  res.status(204).end();
};

/** Step 1 of enrolment: mint a secret. MFA stays off until a code proves the device has it. */
export const mfaSetup = (db: Db = prisma): RequestHandler => async (req, res) => {
  const user = await db.user.findUnique({ where: { id: req.user!.id } });
  if (!user?.email || user.mfaEnabled) {
    sendError(res, 'CONFLICT');
    return;
  }
  const { secret, encrypted, otpauthUrl } = newTotpSecret(user.email);
  await db.user.update({ where: { id: user.id }, data: { mfaSecretEnc: encrypted } });
  sendJson(res, { secret, otpauthUrl });
};

/** Step 2: confirm with a code, switch MFA on, and show the recovery codes once. */
export const mfaEnable = (db: Db = prisma): RequestHandler => async (req, res) => {
  const { code } = req.valid!.body as z.infer<typeof mfaEnableBody>;
  const user = await db.user.findUnique({ where: { id: req.user!.id } });
  if (!user?.mfaSecretEnc || user.mfaEnabled || !isTotpShaped(code) || !(await checkTotp(user.mfaSecretEnc, code))) {
    sendError(res, 'INVALID_MFA_CODE');
    return;
  }
  const { plain, hashes } = newRecoveryCodes();
  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { mfaEnabled: true } }),
    db.mfaRecoveryCode.deleteMany({ where: { userId: user.id } }),
    db.mfaRecoveryCode.createMany({ data: hashes.map((codeHash) => ({ userId: user.id, codeHash })) }),
  ]);
  await revokeUserSessions(user.id, db, req.sessionId);
  await audit(db, req, user.id, 'auth.mfa.enabled');
  sendJson(res, { recoveryCodes: plain });
};

export const mfaDisable = (db: Db = prisma): RequestHandler => async (req, res) => {
  const { password, code } = req.valid!.body as z.infer<typeof mfaDisableBody>;
  const user = await db.user.findUnique({ where: { id: req.user!.id } });

  if (!user?.passwordHash || !user.mfaEnabled || !user.mfaSecretEnc) {
    sendError(res, 'CONFLICT');
    return;
  }
  if (env.MFA_REQUIRED_ROLES.includes(user.role)) {
    sendError(res, 'FORBIDDEN', { reason: 'mfa is required for this role' });
    return;
  }
  const codeOk = isTotpShaped(code) ? await checkTotp(user.mfaSecretEnc, code) : await consumeRecoveryCode(user.id, code, db);
  if (!(await verifyPassword(user.passwordHash, password)) || !codeOk) {
    await recordFailure(user, db);
    sendError(res, 'INVALID_CREDENTIALS');
    return;
  }
  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { mfaEnabled: false, mfaSecretEnc: null } }),
    db.mfaRecoveryCode.deleteMany({ where: { userId: user.id } }),
  ]);
  await audit(db, req, user.id, 'auth.mfa.disabled');
  res.status(204).end();
};

