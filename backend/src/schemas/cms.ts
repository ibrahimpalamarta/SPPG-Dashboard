import { z } from 'zod';
import { ContentStatus, DocumentFileType } from '@prisma/client';
import { pageQuery } from '../lib/pagination.js';

/** SCRUM-14. `storageKey` is the S3 object key; uploading the bytes is out of
 * scope for this phase, so the client supplies the key it already wrote to. */
const storageKey = z.string().min(1).max(1024);

export const cmsListQuery = pageQuery.extend({
  status: z.nativeEnum(ContentStatus).optional(),
  search: z.string().min(1).max(160).optional(),
});

export const cmsDocumentListQuery = cmsListQuery.extend({
  category: z.string().min(1).max(120).optional(),
});

const announcementFields = {
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(20_000),
  status: z.nativeEnum(ContentStatus).optional(),
};

export const announcementCreate = z.object(announcementFields);
export const announcementUpdate = z.object(announcementFields).partial();

const documentFields = {
  title: z.string().min(1).max(200),
  category: z.string().min(1).max(120),
  fileType: z.nativeEnum(DocumentFileType),
  storageKey,
  status: z.nativeEnum(ContentStatus).optional(),
};

export const documentCreate = z.object(documentFields);
export const documentUpdate = z.object(documentFields).partial();

const galleryFields = {
  imageTitle: z.string().min(1).max(200),
  description: z.string().max(2000).nullish(),
  category: z.string().min(1).max(120),
  storageKey,
  status: z.nativeEnum(ContentStatus).optional(),
};

export const galleryCreate = z.object(galleryFields);
export const galleryUpdate = z.object(galleryFields).partial();
