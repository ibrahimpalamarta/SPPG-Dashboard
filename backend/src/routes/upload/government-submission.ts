import { Router } from 'express';
import { requirePermission } from '../../auth/guard.js';
import { validate } from '../../middleware/validate.js';
import { wrap } from '../../lib/wrap.js';
import { governmentSubmissionCreate, governmentSubmissionListQuery } from '../../schemas/government-submission.js';
import { listGovernmentSubmissions, recordGovernmentSubmission } from '../../controllers/upload/government-submission.js';

export const governmentSubmissionRouter = Router();

governmentSubmissionRouter.get('/', requirePermission('upload:view'), validate({ query: governmentSubmissionListQuery }), wrap(listGovernmentSubmissions()));
// Reporting to SIPGN/POP/Aksis is done on published data, by whoever publishes it.
governmentSubmissionRouter.post('/', requirePermission('batch:publish'), validate({ body: governmentSubmissionCreate }), wrap(recordGovernmentSubmission()));
