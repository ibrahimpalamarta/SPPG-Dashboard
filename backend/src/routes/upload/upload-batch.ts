import { Router } from 'express';
import { requirePermission } from '../../auth/guard.js';
import { validate } from '../../middleware/validate.js';
import { singleFile } from '../../middleware/upload.js';
import { wrap } from '../../lib/wrap.js';
import { idParam } from '../../schemas/common.js';
import { batchReturn, templateParam } from '../../schemas/upload-batch.js';
import { publishUploadBatch, returnUploadBatch, submitUploadBatch } from '../../controllers/upload/review.js';
import {
  uploadBatchCreate,
  uploadBatchCreateQuery,
  uploadBatchListQuery,
  uploadBatchUpdate,
} from '../../schemas/upload-batch.js';
import {
  createUploadBatch,
  deleteUploadBatch,
  downloadUploadBatchFile,
  getUploadBatch,
  downloadTemplate,
  listUploadBatches,
  listUploadBatchHistory,
  listUploadBatchRecords,
  updateUploadBatch,
} from '../../controllers/upload/upload-batch.js';
import { pageQuery } from '../../lib/pagination.js';

export const uploadBatchRouter = Router();

// SCRUM-7/20: history needs upload:view; the controller narrows the rows to
// the caller's dapur.
uploadBatchRouter.use(requirePermission('upload:view'));
uploadBatchRouter.get('/', validate({ query: uploadBatchListQuery }), wrap(listUploadBatches()));
uploadBatchRouter.get('/templates/:kind', validate({ params: templateParam }), wrap(downloadTemplate()));
uploadBatchRouter.get('/:id', validate({ params: idParam }), wrap(getUploadBatch()));
uploadBatchRouter.get('/:id/file', validate({ params: idParam }), wrap(downloadUploadBatchFile()));
uploadBatchRouter.get('/:id/records', validate({ params: idParam, query: pageQuery }), wrap(listUploadBatchRecords()));
uploadBatchRouter.get('/:id/history', validate({ params: idParam }), wrap(listUploadBatchHistory()));
uploadBatchRouter.delete('/:id', requirePermission('batch:review'), validate({ params: idParam }), wrap(deleteUploadBatch()));

// SCRUM-20: uploading needs upload:create; changing a batch's verdict is a
// review (batch:review, PM only).
// multer runs before validate() because it is what populates req.body for a
// multipart request — there is nothing to validate until it has parsed the form.
uploadBatchRouter.post(
  '/',
  requirePermission('upload:create'),
  singleFile('file', ['.xlsx', '.csv']),
  validate({ body: uploadBatchCreate, query: uploadBatchCreateQuery }),
  wrap(createUploadBatch()),
);
// SCRUM-117/95: Data Operasional (the maker) submits; PM MBG returns or publishes.
uploadBatchRouter.post('/:id/submit', requirePermission('upload:create'), validate({ params: idParam }), wrap(submitUploadBatch()));
uploadBatchRouter.post('/:id/return', requirePermission('batch:publish'), validate({ params: idParam, body: batchReturn }), wrap(returnUploadBatch()));
uploadBatchRouter.post('/:id/publish', requirePermission('batch:publish'), validate({ params: idParam }), wrap(publishUploadBatch()));
uploadBatchRouter.patch(
  '/:id',
  requirePermission('batch:review'),
  validate({ params: idParam, body: uploadBatchUpdate }),
  wrap(updateUploadBatch()),
);
