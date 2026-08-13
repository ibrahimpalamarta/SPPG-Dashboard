import { Router } from 'express';
import { getMe } from '../../controllers/auth/me.js';

export const meRouter = Router();

meRouter.get('/', getMe);
