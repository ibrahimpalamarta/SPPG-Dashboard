import { Router } from 'express';
import { requireRole } from '../../auth/guard.js';
import { validate } from '../../middleware/validate.js';
import { wrap } from '../../lib/wrap.js';
import { idParam } from '../../schemas/common.js';
import {
  uploadBatchCreate,
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

// SCRUM-7: history is readable by every authenticated role; the controller
// narrows the rows to the caller's dapur.
uploadBatchRouter.get('/', validate({ query: uploadBatchListQuery }), wrap(listUploadBatches()));
uploadBatchRouter.get('/:id', validate({ params: idParam }), wrap(getUploadBatch()));

// SCRUM-5/6: only the roles that actually enter data may register or review one.
uploadBatchRouter.post(
  '/',
  requireRole('SUPER_ADMIN', 'DATA_ADMIN'),
  validate({ body: uploadBatchCreate }),
  wrap(createUploadBatch()),
);
uploadBatchRouter.patch(
  '/:id',
  requireRole('SUPER_ADMIN', 'DATA_ADMIN'),
  validate({ params: idParam, body: uploadBatchUpdate }),
  wrap(updateUploadBatch()),
);
