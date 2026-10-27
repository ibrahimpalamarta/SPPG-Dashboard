import { Router } from 'express';
import { wrap } from '../../lib/wrap.js';
import { getMe } from '../../controllers/auth/me.js';

export const meRouter = Router();

meRouter.get('/', wrap(getMe()));
