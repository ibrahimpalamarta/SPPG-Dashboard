import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { wrap } from '../../lib/wrap.js';
import { idParam } from '../../schemas/common.js';
import { akgTargetListQuery } from '../../schemas/akg-target.js';
import { getAkgTarget, listAkgTargets } from '../../controllers/master/akg-target.js';

// Seeded lookup table — no write routes on purpose (SCRUM-8).
export const akgTargetRouter = Router();

akgTargetRouter.get('/', validate({ query: akgTargetListQuery }), wrap(listAkgTargets()));
akgTargetRouter.get('/:id', validate({ params: idParam }), wrap(getAkgTarget()));
