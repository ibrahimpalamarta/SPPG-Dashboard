import type { RequestHandler } from 'express';
import type { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma, type Db } from '../../db.js';
import { sendError } from '../../middleware/error-handler.js';
import { sendJson } from '../../lib/serialize.js';
import { pageArgs, paginated } from '../../lib/pagination.js';
import type { akgTargetListQuery } from '../../schemas/akg-target.js';

/**
 * SCRUM-8. Read-only by design: the 12 rows are Tabel 2 of SOP-OPR-001
 * (Juknis 401.1/2025) and are loaded by `npm run seed:reference`, not entered
 * through the API.
 *
 * `seratMin` / `seratMax` come back null on every row — the official reference
 * table has no fibre range. Do not treat that as missing data to fill in.
 */
export const listAkgTargets = (db: Db = prisma): RequestHandler => async (req, res) => {
  const q = req.valid!.query as z.infer<typeof akgTargetListQuery>;
  const where: Prisma.AkgTargetWhereInput = q.pendistribusianMbg
    ? { pendistribusianMbg: q.pendistribusianMbg }
    : {};

  const [rows, total] = await Promise.all([
    db.akgTarget.findMany({
      where,
      orderBy: [{ kelompokSasaran: 'asc' }, { pendistribusianMbg: 'asc' }],
      ...pageArgs(q),
    }),
    db.akgTarget.count({ where }),
  ]);

  sendJson(res, paginated(rows, total, q));
};

export const getAkgTarget = (db: Db = prisma): RequestHandler => async (req, res) => {
  const { id } = req.valid!.params as { id: bigint };
  const row = await db.akgTarget.findUnique({ where: { id } });
  if (!row) {
    sendError(res, 'NOT_FOUND');
    return;
  }
  sendJson(res, row);
};
