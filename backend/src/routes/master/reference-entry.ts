import { Router } from 'express';
import { requirePermission } from '../../auth/guard.js';
import { validate } from '../../middleware/validate.js';
import { wrap } from '../../lib/wrap.js';
import { idParam } from '../../schemas/common.js';
import { referenceEntryListQuery, referenceEntryUpdate } from '../../schemas/reference-entry.js';
import { listReferenceEntries, updateReferenceEntry } from '../../controllers/master/reference-entry.js';

export const referenceEntryRouter = Router();

referenceEntryRouter.get('/', validate({ query: referenceEntryListQuery }), wrap(listReferenceEntries()));

// SCRUM-20/123: Data Reference is read-only for Data Operasional; only Admin
// (reference:edit) changes it.
referenceEntryRouter.patch(
  '/:id',
  requirePermission('reference:edit'),
  validate({ params: idParam, body: referenceEntryUpdate }),
  wrap(updateReferenceEntry()),
);
