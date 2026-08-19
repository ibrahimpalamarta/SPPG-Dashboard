import { Router } from 'express';
import type { RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';
import { requireRole } from '../../auth/guard.js';
import { validate } from '../../middleware/validate.js';
import { wrap } from '../../lib/wrap.js';
import { idParam } from '../../schemas/common.js';
import {
  announcementCreate,
  announcementUpdate,
  cmsDocumentListQuery,
  cmsListQuery,
  documentCreate,
  documentUpdate,
  galleryCreate,
  galleryUpdate,
} from '../../schemas/cms.js';
import {
  ANNOUNCEMENT,
  DOCUMENT,
  GALLERY,
  createCms,
  deleteCms,
  getCms,
  listCms,
  updateCms,
  type CmsResource,
} from '../../controllers/cms/cms.js';

/** SCRUM-14: content is CMS_ADMIN's job; Super Admin keeps the master key. */
const cmsRoles: RequestHandler = requireRole('SUPER_ADMIN', 'CMS_ADMIN');

function cmsRouter(resource: CmsResource, schemas: {
  list: ZodTypeAny;
  create: ZodTypeAny;
  update: ZodTypeAny;
}): Router {
  const router = Router();
  router.use(cmsRoles);

  router.get('/', validate({ query: schemas.list }), wrap(listCms(resource)));
  router.get('/:id', validate({ params: idParam }), wrap(getCms(resource)));
  router.post('/', validate({ body: schemas.create }), wrap(createCms(resource)));
  router.patch(
    '/:id',
    validate({ params: idParam, body: schemas.update }),
    wrap(updateCms(resource)),
  );
  router.delete('/:id', validate({ params: idParam }), wrap(deleteCms(resource)));

  return router;
}

export const announcementRouter = cmsRouter(ANNOUNCEMENT, {
  list: cmsListQuery,
  create: announcementCreate,
  update: announcementUpdate,
});

export const documentRouter = cmsRouter(DOCUMENT, {
  list: cmsDocumentListQuery,
  create: documentCreate,
  update: documentUpdate,
});

export const galleryRouter = cmsRouter(GALLERY, {
  list: cmsDocumentListQuery,
  create: galleryCreate,
  update: galleryUpdate,
});
