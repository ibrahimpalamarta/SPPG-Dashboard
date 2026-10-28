import { Router } from 'express';
import { wrap } from '../../lib/wrap.js';
import { getInbox } from '../../controllers/inbox/inbox.js';

export const inboxRouter = Router();

// No requirePermission here: the controller narrows each section by
// permission, so a view-only role gets an empty (not forbidden) inbox.
inboxRouter.get('/', wrap(getInbox()));
