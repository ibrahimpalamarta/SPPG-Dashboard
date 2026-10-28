import type { RequestHandler } from 'express';
import type { Prisma } from '@prisma/client';
import type { z } from 'zod';
import { prisma, type Db } from '../../db.js';
import { sendError } from '../../middleware/error-handler.js';
import { sendJson } from '../../lib/serialize.js';
import { writeAuditLog } from '../../auth/audit.js';
import { EDITABLE_FIELDS, type referenceEntryListQuery, type referenceEntryUpdate } from '../../schemas/reference-entry.js';

export const listReferenceEntries = (db: Db = prisma): RequestHandler => async (req, res) => {
  const { kind } = req.valid!.query as z.infer<typeof referenceEntryListQuery>;
  const rows = await db.referenceEntry.findMany({ where: { kind }, orderBy: { sortOrder: 'asc' } });
  // Envelope matches every other list endpoint in this app (frontend apiGet<{data:T[]}>), even unpaginated.
  sendJson(res, { data: rows });
};

export const updateReferenceEntry = (db: Db = prisma): RequestHandler => async (req, res) => {
  const { id } = req.valid!.params as { id: bigint };
  const body = req.valid!.body as z.infer<typeof referenceEntryUpdate>;

  const existing = await db.referenceEntry.findUnique({ where: { id } });
  if (!existing) {
    sendError(res, 'NOT_FOUND');
    return;
  }

  // Only the fields the entry's tab actually owns; a stray field from another
  // tab's form (there shouldn't be one) is dropped rather than rejected.
  const allowed = EDITABLE_FIELDS[existing.kind];
  const patch = Object.fromEntries(Object.entries(body).filter(([key]) => (allowed as string[]).includes(key)));

  const row = await db.referenceEntry.update({
    where: { id },
    // `fields` is Json, so Prisma types it as an opaque value — the shape is ours by construction (seeded + this merge).
    data: { fields: { ...(existing.fields as Record<string, unknown>), ...patch } as Prisma.InputJsonValue },
  });
  await writeAuditLog(db, {
    userId: req.user!.id,
    action: 'reference_entry.updated',
    entity: 'reference_entries',
    entityId: row.id,
    metadata: { fields: Object.keys(patch) },
  });
  sendJson(res, row);
};
