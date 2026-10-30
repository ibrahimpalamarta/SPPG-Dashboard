import { Router } from 'express';
import { requirePermission } from '../../auth/guard.js';
import { validate } from '../../middleware/validate.js';
import { wrap } from '../../lib/wrap.js';
import { validationIssueListQuery, validationIssueResolve } from '../../schemas/validation-issue.js';
import { listValidationIssues, resolveValidationIssues } from '../../controllers/upload/validation-issue.js';

export const validationIssueRouter = Router();

// Same audience as the upload history; rows are narrowed to the caller's dapur.
validationIssueRouter.use(requirePermission('upload:view'));
validationIssueRouter.get('/', validate({ query: validationIssueListQuery }), wrap(listValidationIssues()));
// PRD §3: reviewing issues is Data Operasional's job, before the batch goes to the PM.
validationIssueRouter.post('/resolve', requirePermission('upload:create'), validate({ body: validationIssueResolve }), wrap(resolveValidationIssues()));
