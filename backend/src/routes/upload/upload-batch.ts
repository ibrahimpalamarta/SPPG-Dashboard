import { Router } from 'express';
import { requirePermission } from '../../auth/guard.js';
import { validate } from '../../middleware/validate.js';
import { singleFile } from '../../middleware/upload.js';
import { wrap } from '../../lib/wrap.js';
import { idParam } from '../../schemas/common.js';
import {
  uploadBatchCreate,
  uploadBatchCreateQuery,
  uploadBatchListQuery,
  uploadBatchUpdate,
} from '../../schemas/upload-batch.js';
import {
  createUploadBatch,
  getUploadBatch,
  listUploadBatches,
  updateUploadBatch,
} from '../../controllers/upload/upload-batch.js';

export const uploadBatchRouter = Router();

// SCRUM-7/20: history needs upload:view; the controller narrows the rows to
// the caller's dapur.
uploadBatchRouter.use(requirePermission('upload:view'));
uploadBatchRouter.get('/', validate({ query: uploadBatchListQuery }), wrap(listUploadBatches()));
uploadBatchRouter.get('/:id', validate({ params: idParam }), wrap(getUploadBatch()));

// SCRUM-20: uploading needs upload:create; changing a batch's verdict is a
// review (batch:review, PM only).
// multer runs before validate() because it is what populates req.body for a
// multipart request — there is nothing to validate until it has parsed the form.
uploadBatchRouter.post(
  '/',
  requirePermission('upload:create'),
  singleFile('file', ['.xlsx']),
  validate({ body: uploadBatchCreate, query: uploadBatchCreateQuery }),
  wrap(createUploadBatch()),
);
uploadBatchRouter.patch(
  '/:id',
  requirePermission('batch:review'),
  validate({ params: idParam, body: uploadBatchUpdate }),
  wrap(updateUploadBatch()),
);
