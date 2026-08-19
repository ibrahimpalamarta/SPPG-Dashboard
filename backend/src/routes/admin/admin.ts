import { Router } from 'express';
import { requireRole } from '../../auth/guard.js';
import { validate } from '../../middleware/validate.js';
import { wrap } from '../../lib/wrap.js';
import { idParam } from '../../schemas/common.js';
import { auditLogListQuery, userListQuery, userUpdate } from '../../schemas/user.js';
import { listAuditLogs, listUsers, updateUser } from '../../controllers/admin/user.js';

/** Account administration and the audit trail: Super Admin only. */
export const adminRouter = Router();

adminRouter.use(requireRole('SUPER_ADMIN'));

adminRouter.get('/users', validate({ query: userListQuery }), wrap(listUsers()));
adminRouter.patch(
  '/users/:id',
  validate({ params: idParam, body: userUpdate }),
  wrap(updateUser()),
);

adminRouter.get('/audit-logs', validate({ query: auditLogListQuery }), wrap(listAuditLogs()));
