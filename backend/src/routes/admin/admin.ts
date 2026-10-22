import { Router } from 'express';
import { requirePermission } from '../../auth/guard.js';
import { validate } from '../../middleware/validate.js';
import { wrap } from '../../lib/wrap.js';
import { idParam } from '../../schemas/common.js';
import { auditLogListQuery, userListQuery, userUpdate } from '../../schemas/user.js';
import { listAuditLogs, listUsers, updateUser } from '../../controllers/admin/user.js';

/** Account administration and the audit trail: member:invite (PM MBG). */
export const adminRouter = Router();

adminRouter.use(requirePermission('member:invite'));

adminRouter.get('/users', validate({ query: userListQuery }), wrap(listUsers()));
adminRouter.patch(
  '/users/:id',
  validate({ params: idParam, body: userUpdate }),
  wrap(updateUser()),
);

adminRouter.get('/audit-logs', validate({ query: auditLogListQuery }), wrap(listAuditLogs()));
