import { Router } from 'express';
import { requireRole } from '../../auth/guard.js';
import { adminPing } from '../../controllers/admin/admin.js';

export const adminRouter = Router();

// Example of the guard in place; feature routes land here next phase.
adminRouter.get('/ping', requireRole('SUPER_ADMIN'), adminPing);
