import { Router } from 'express';
import { requirePermission } from '../../auth/guard.js';
import { validate } from '../../middleware/validate.js';
import { wrap } from '../../lib/wrap.js';
import { idParam } from '../../schemas/common.js';
import {
  auditLogListQuery,
  roleParam,
  rolePermissionsBody,
  userCreate,
  userListQuery,
  userUpdate,
} from '../../schemas/user.js';
import {
  cancelInvite,
  createPasswordReset,
  createUser,
  listAuditLogs,
  listRoles,
  listUserSessions,
  listUsers,
  resetUserMfa,
  revokeAllUserSessions,
  updateRolePermissions,
  updateUser,
} from '../../controllers/admin/user.js';

/**
 * Account administration, role editing and the audit trail. Each route names
 * the permission it needs; none relies on the menu being hidden in the UI.
 */
export const adminRouter = Router();

adminRouter.get('/users', requirePermission('users:read'), validate({ query: userListQuery }), wrap(listUsers()));
adminRouter.post('/users', requirePermission('users:manage'), validate({ body: userCreate }), wrap(createUser()));
adminRouter.patch(
  '/users/:id',
  requirePermission('users:manage'),
  validate({ params: idParam, body: userUpdate }),
  wrap(updateUser()),
);
adminRouter.post(
  '/users/:id/password-reset',
  requirePermission('users:manage'),
  validate({ params: idParam }),
  wrap(createPasswordReset()),
);
adminRouter.post('/users/:id/invite-cancel', requirePermission('users:manage'), validate({ params: idParam }), wrap(cancelInvite()));
adminRouter.post('/users/:id/mfa-reset', requirePermission('users:manage'), validate({ params: idParam }), wrap(resetUserMfa()));
adminRouter.get('/users/:id/sessions', requirePermission('users:read'), validate({ params: idParam }), wrap(listUserSessions()));
adminRouter.delete(
  '/users/:id/sessions',
  requirePermission('users:manage'),
  validate({ params: idParam }),
  wrap(revokeAllUserSessions()),
);

adminRouter.get('/roles', requirePermission('settings:manage'), wrap(listRoles()));
adminRouter.put(
  '/roles/:role/permissions',
  requirePermission('settings:manage'),
  validate({ params: roleParam, body: rolePermissionsBody }),
  wrap(updateRolePermissions()),
);

adminRouter.get('/audit-logs', requirePermission('audit:read'), validate({ query: auditLogListQuery }), wrap(listAuditLogs()));
