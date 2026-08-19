import { z } from 'zod';
import { ContentStatus } from '@prisma/client';
import { pageQuery } from '../lib/pagination.js';

/**
 * SCRUM-14 AC2. Documents and gallery images arrive as `multipart/form-data`
 * with the file in field `file`, so every value here is a form field string.
 *
 * `storageKey` and `fileType` are no longer client input: the server writes the
 * object and reads the type off the file it actually received, so a record can
 * never point at a key nobody uploaded or claim a type it is not.
 */

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
  status: z.nativeEnum(ContentStatus).optional(),
};

export const documentCreate = z.object(documentFields);
export const documentUpdate = z.object(documentFields).partial();

const galleryFields = {
  imageTitle: z.string().min(1).max(200),
  description: z.string().max(2000).nullish(),
  category: z.string().min(1).max(120),
  status: z.nativeEnum(ContentStatus).optional(),
};

export const galleryCreate = z.object(galleryFields);
export const galleryUpdate = z.object(galleryFields).partial();
