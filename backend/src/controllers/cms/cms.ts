import type { RequestHandler } from 'express';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import type { z } from 'zod';
import { ContentStatus, DocumentFileType, Prisma } from '@prisma/client';
import { prisma, type Db } from '../../db.js';
import { sendError } from '../../middleware/error-handler.js';
import { sendJson } from '../../lib/serialize.js';
import { pageArgs, paginated } from '../../lib/pagination.js';
import { putObject, type PutObject } from '../../lib/s3.js';
import { writeAuditLog } from '../../auth/audit.js';
import type {
  announcementCreate,
  cmsDocumentListQuery,
  cmsListQuery,
  documentCreate,
  galleryCreate,
} from '../../schemas/cms.js';

// ---------------------------------------------------------------------------
// SCRUM-14. The three CMS resources differ only in their columns, so the
// handlers are generated from one description each rather than written out
// three times. "All actions logged" is part of the ticket, so every mutation
// writes an audit row.
//
// Publishing is a status change, not a separate endpoint: PATCH
// { status: 'PUBLISHED' } stamps publishDate on the way through.
// ---------------------------------------------------------------------------

type CmsModel = 'cmsAnnouncement' | 'cmsDocument' | 'galleryImage';

export interface CmsResource {
  model: CmsModel;
  entity: string;
  /** Column holding the human-readable name, used for search and audit. */
  titleField: 'title' | 'imageTitle';
  /** Column recording who created the row. */
  authorField: 'createdById' | 'uploadedById';
  /** Only cms_announcements has a publishDate column to stamp. */
  hasPublishDate: boolean;
  hasCategory: boolean;
  /** Set for resources backed by an uploaded file (SCRUM-14 AC2). */
  file?: {
    /** Accepted extensions, and the S3 prefix objects are written under. */
    extensions: readonly string[];
    prefix: string;
    /** cms_documents also records which of the three formats it received. */
    typeColumn?: boolean;
  };
}

const DOCUMENT_TYPES: Record<string, DocumentFileType> = {
  '.pdf': DocumentFileType.PDF,
  '.docx': DocumentFileType.DOCX,
  '.xlsx': DocumentFileType.XLSX,
};

/**
 * Writes the upload and returns the columns that describe it. The key is a
 * fresh UUID rather than the file name: two people uploading "SOP.pdf" must not
 * collide, and a caller-supplied name must never steer where we write.
 */
async function storeFile(
  resource: CmsResource,
  upload: Express.Multer.File,
  put: PutObject,
): Promise<Record<string, unknown>> {
  const ext = extname(upload.originalname).toLowerCase();
  const storageKey = await put(
    `${resource.file!.prefix}/${randomUUID()}${ext}`,
    upload.buffer,
    upload.mimetype,
  );
  return {
    storageKey,
    ...(resource.file!.typeColumn && { fileType: DOCUMENT_TYPES[ext] }),
  };
}

export const ANNOUNCEMENT: CmsResource = {
  model: 'cmsAnnouncement',
  entity: 'cms_announcements',
  titleField: 'title',
  authorField: 'createdById',
  hasPublishDate: true,
  hasCategory: false,
};

export const DOCUMENT: CmsResource = {
  model: 'cmsDocument',
  entity: 'cms_documents',
  titleField: 'title',
  authorField: 'uploadedById',
  hasPublishDate: false,
  hasCategory: true,
  file: { extensions: Object.keys(DOCUMENT_TYPES), prefix: 'cms/documents', typeColumn: true },
};

export const GALLERY: CmsResource = {
  model: 'galleryImage',
  entity: 'gallery_images',
  titleField: 'imageTitle',
  authorField: 'uploadedById',
  hasPublishDate: false,
  hasCategory: true,
  file: { extensions: ['.jpg', '.jpeg', '.png', '.webp'], prefix: 'cms/gallery' },
};

/**
 * The three delegates have identical call signatures for the operations used
 * here but Prisma types them per-model, so there is no single type that unifies
 * them without collapsing the arguments to `any`. Narrowing to the four methods
 * actually called keeps the escape hatch small and local.
 */
type CmsDelegate = {
  findMany(args: unknown): Promise<Record<string, unknown>[]>;
  findUnique(args: unknown): Promise<Record<string, unknown> | null>;
  count(args: unknown): Promise<number>;
  create(args: unknown): Promise<Record<string, unknown>>;
  update(args: unknown): Promise<Record<string, unknown>>;
  delete(args: unknown): Promise<Record<string, unknown>>;
};

function delegate(db: Db, resource: CmsResource): CmsDelegate {
  return db[resource.model] as unknown as CmsDelegate;
}

export function listCms(resource: CmsResource, db: Db = prisma): RequestHandler {
  return async (req, res) => {
    const q = req.valid!.query as z.infer<typeof cmsListQuery & typeof cmsDocumentListQuery>;
    const where: Record<string, unknown> = {
      ...(q.status && { status: q.status }),
      ...(q.search && { [resource.titleField]: { contains: q.search, mode: 'insensitive' } }),
      ...(resource.hasCategory && q.category ? { category: q.category } : {}),
    };

    const [rows, total] = await Promise.all([
      delegate(db, resource).findMany({ where, orderBy: { createdAt: 'desc' }, ...pageArgs(q) }),
      delegate(db, resource).count({ where }),
    ]);

    sendJson(res, paginated(rows, total, q));
  };
}

export function getCms(resource: CmsResource, db: Db = prisma): RequestHandler {
  return async (req, res) => {
    const { id } = req.valid!.params as { id: bigint };
    const row = await delegate(db, resource).findUnique({ where: { id } });
    if (!row) {
      sendError(res, 'NOT_FOUND');
      return;
    }
    sendJson(res, row);
  };
}

/** A row published at creation time gets its publishDate stamped immediately;
 * a draft leaves it null until the PATCH that publishes it. */
function publishStamp(resource: CmsResource, status: ContentStatus | undefined) {
  if (!resource.hasPublishDate) return {};
  return status === ContentStatus.PUBLISHED ? { publishDate: new Date() } : {};
}

export function createCms(
  resource: CmsResource,
  db: Db = prisma,
  put: PutObject = putObject,
): RequestHandler {
  return async (req, res) => {
    const body = req.valid!.body as z.infer<
      typeof announcementCreate & typeof documentCreate & typeof galleryCreate
    >;
    const row = await delegate(db, resource).create({
      data: {
        ...body,
        ...(resource.file && req.file ? await storeFile(resource, req.file, put) : {}),
        [resource.authorField]: req.user!.id,
        ...publishStamp(resource, body.status),
      },
    });

    await writeAuditLog(db, {
      userId: req.user!.id,
      action: `${resource.entity}.created`,
      entity: resource.entity,
      entityId: row.id as bigint,
      metadata: { title: String(row[resource.titleField]), status: String(row.status) },
    });

    sendJson(res, row, 201);
  };
}

export function updateCms(
  resource: CmsResource,
  db: Db = prisma,
  put: PutObject = putObject,
): RequestHandler {
  return async (req, res) => {
    const { id } = req.valid!.params as { id: bigint };
    const body = req.valid!.body as Record<string, unknown> & { status?: ContentStatus };

    const current = await delegate(db, resource).findUnique({ where: { id } });
    if (!current) {
      sendError(res, 'NOT_FOUND');
      return;
    }

    // Only stamp on the DRAFT -> PUBLISHED transition, so re-saving a live
    // announcement does not silently move its publication date.
    const stamp =
      body.status === ContentStatus.PUBLISHED && current.status !== ContentStatus.PUBLISHED
        ? publishStamp(resource, body.status)
        : {};

    // Replacing the file is optional on update: no `file` part means only the
    // metadata changes and the record keeps pointing at the object it had.
    const replaced = resource.file && req.file ? await storeFile(resource, req.file, put) : {};

    const row = await delegate(db, resource).update({
      where: { id },
      data: { ...body, ...replaced, ...stamp },
    });

    await writeAuditLog(db, {
      userId: req.user!.id,
      action:
        body.status && body.status !== current.status
          ? `${resource.entity}.status_changed`
          : `${resource.entity}.updated`,
      entity: resource.entity,
      entityId: id,
      metadata: {
        fields: [...Object.keys(body), ...Object.keys(replaced)],
        ...(body.status && { from: String(current.status), to: String(body.status) }),
      },
    });

    sendJson(res, row);
  };
}

export function deleteCms(resource: CmsResource, db: Db = prisma): RequestHandler {
  return async (req, res) => {
    const { id } = req.valid!.params as { id: bigint };
    try {
      const row = await delegate(db, resource).delete({ where: { id } });
      await writeAuditLog(db, {
        userId: req.user!.id,
        action: `${resource.entity}.deleted`,
        entity: resource.entity,
        entityId: id,
        metadata: { title: String(row[resource.titleField]) },
      });
      // The S3 object behind storageKey is deliberately left in place: this
      // phase does not own the bucket lifecycle.
      res.status(204).end();
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        sendError(res, 'NOT_FOUND');
        return;
      }
      throw err;
    }
  };
}
