import type { RequestHandler } from 'express';
import type { z } from 'zod';
import { ContentStatus, Prisma } from '@prisma/client';
import { prisma, type Db } from '../../db.js';
import { sendError } from '../../middleware/error-handler.js';
import { sendJson } from '../../lib/serialize.js';
import { pageArgs, paginated } from '../../lib/pagination.js';
import type { publicContentQuery, publicNutritionQuery } from '../../schemas/public.js';

// ---------------------------------------------------------------------------
// SCRUM-13. Everything in this file is served to anonymous callers, so the
// rules are stricter than anywhere else in the API:
//
//   * Rows are keyed by `public_id` (UUID). A sequential BigInt never leaves
//     this module — publishing one would let anyone walk the table.
//   * Nutrition and coverage come from the two database views, which were
//     built to exclude every internal column. Reading the base tables here
//     would put that guarantee back in application code.
//   * CMS content is filtered to status = PUBLISHED. A draft is not public.
// ---------------------------------------------------------------------------

/** Program-wide KPI headline (SCRUM-11). The most recent period wins. */
export const getPublicSummary = (db: Db = prisma): RequestHandler => async (_req, res) => {
  const row = await db.publicSummary.findFirst({
    orderBy: { periodEnd: 'desc' },
    select: {
      publicId: true,
      periodStart: true,
      periodEnd: true,
      mealsServed: true,
      kitchensActive: true,
      coverageCount: true,
      lastRefreshedAt: true,
    },
  });

  // No period computed yet is a normal state before the refresh job exists —
  // an empty shape keeps the frontend from special-casing a 404.
  if (!row) {
    sendJson(res, {
      publicId: null,
      periodStart: null,
      periodEnd: null,
      mealsServed: 0,
      kitchensActive: 0,
      coverageCount: 0,
      lastRefreshedAt: null,
    });
    return;
  }

  sendJson(res, row);
};

interface CoverageRow {
  kitchen_public_id: string;
  kitchen_name: string;
  province: string | null;
  city_regency: string | null;
  district: string | null;
  village: string | null;
  latitude: Prisma.Decimal | null;
  longitude: Prisma.Decimal | null;
  period_start: Date | null;
  period_end: Date | null;
  meals_served: number | null;
  coverage_count: number | null;
  last_refreshed_at: Date | null;
}

/**
 * SCRUM-15 for the public site. Reads `public_kitchen_coverage_view`, which is
 * not modelled in schema.prisma — hence $queryRaw. The column list is written
 * out rather than `SELECT *` so a future column added to the view cannot leak
 * here by accident.
 *
 * Region and coordinates come back null for all six kitchens until the master
 * dapur file arrives; the map has nothing to plot yet, by design rather than
 * by bug.
 */
export const listPublicKitchens = (db: Db = prisma): RequestHandler => async (_req, res) => {
  const rows = await db.$queryRaw<CoverageRow[]>`
    SELECT kitchen_public_id, kitchen_name, province, city_regency, district, village,
           latitude, longitude, period_start, period_end, meals_served,
           coverage_count, last_refreshed_at
    FROM public_kitchen_coverage_view
    ORDER BY kitchen_name ASC
  `;

  // The rest of the API speaks camelCase; a raw query is the only place that
  // would otherwise leak snake_case column names to the client.
  const data = rows.map((r) => ({
    publicId: r.kitchen_public_id,
    name: r.kitchen_name,
    province: r.province,
    cityRegency: r.city_regency,
    district: r.district,
    village: r.village,
    latitude: r.latitude,
    longitude: r.longitude,
    periodStart: r.period_start,
    periodEnd: r.period_end,
    mealsServed: r.meals_served,
    coverageCount: r.coverage_count,
    lastRefreshedAt: r.last_refreshed_at,
  }));

  sendJson(res, { data });
};

interface NutritionRow {
  menu_nutrition_public_id: string;
  kitchen_public_id: string;
  kitchen_name: string;
  province: string | null;
  city_regency: string | null;
  tanggal: Date;
  portion_class: string;
  total_energi: Prisma.Decimal | null;
  total_protein: Prisma.Decimal | null;
  total_lemak: Prisma.Decimal | null;
  total_karbohidrat: Prisma.Decimal | null;
  total_serat: Prisma.Decimal | null;
  last_refreshed_at: Date | null;
}

/**
 * SCRUM-12 for the public site, from `public_menu_nutrition_view`.
 *
 * Filters are interpolated through tagged-template parameters, never string
 * concatenation — `$queryRaw` parameterises them, so a UUID or enum arriving
 * from the query string cannot become SQL.
 */
export const listPublicNutrition = (db: Db = prisma): RequestHandler => async (req, res) => {
  const q = req.valid!.query as z.infer<typeof publicNutritionQuery>;

  const conditions: Prisma.Sql[] = [];
  if (q.kitchen) conditions.push(Prisma.sql`kitchen_public_id = ${q.kitchen}::uuid`);
  if (q.portionClass) {
    conditions.push(Prisma.sql`portion_class = ${q.portionClass}::"PortionClass"`);
  }
  if (q.dateFrom) conditions.push(Prisma.sql`tanggal >= ${q.dateFrom}`);
  if (q.dateTo) conditions.push(Prisma.sql`tanggal <= ${q.dateTo}`);

  const where =
    conditions.length === 0 ? Prisma.empty : Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`;

  const [rows, counted] = await Promise.all([
    db.$queryRaw<NutritionRow[]>`
      SELECT menu_nutrition_public_id, kitchen_public_id, kitchen_name, province,
             city_regency, tanggal, portion_class, total_energi, total_protein,
             total_lemak, total_karbohidrat, total_serat, last_refreshed_at
      FROM public_menu_nutrition_view
      ${where}
      ORDER BY tanggal DESC, kitchen_name ASC
      LIMIT ${q.pageSize} OFFSET ${(q.page - 1) * q.pageSize}
    `,
    db.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint AS count FROM public_menu_nutrition_view ${where}
    `,
  ]);

  const data = rows.map((r) => ({
    publicId: r.menu_nutrition_public_id,
    kitchenPublicId: r.kitchen_public_id,
    kitchenName: r.kitchen_name,
    province: r.province,
    cityRegency: r.city_regency,
    tanggal: r.tanggal,
    portionClass: r.portion_class,
    totalEnergi: r.total_energi,
    totalProtein: r.total_protein,
    totalLemak: r.total_lemak,
    totalKarbohidrat: r.total_karbohidrat,
    totalSerat: r.total_serat,
    lastRefreshedAt: r.last_refreshed_at,
  }));

  sendJson(res, paginated(data, Number(counted[0]?.count ?? 0), q));
};

/** Published announcements (SCRUM-14). */
export const listPublicAnnouncements = (db: Db = prisma): RequestHandler => async (req, res) => {
  const q = req.valid!.query as z.infer<typeof publicContentQuery>;
  const where = { status: ContentStatus.PUBLISHED };

  const [rows, total] = await Promise.all([
    db.cmsAnnouncement.findMany({
      where,
      select: { publicId: true, title: true, body: true, publishDate: true },
      orderBy: [{ publishDate: 'desc' }, { id: 'desc' }],
      ...pageArgs(q),
    }),
    db.cmsAnnouncement.count({ where }),
  ]);

  sendJson(res, paginated(rows, total, q));
};

export const getPublicAnnouncement = (db: Db = prisma): RequestHandler => async (req, res) => {
  const { publicId } = req.valid!.params as { publicId: string };
  const row = await db.cmsAnnouncement.findFirst({
    where: { publicId, status: ContentStatus.PUBLISHED },
    select: { publicId: true, title: true, body: true, publishDate: true },
  });
  // A draft answers 404, not 403: its existence is not public information.
  if (!row) {
    sendError(res, 'NOT_FOUND');
    return;
  }
  sendJson(res, row);
};

/** Downloadable documents (SCRUM-14). `storageKey` is withheld — the object is
 * fetched through the assets bucket, not by handing out its raw key. */
export const listPublicDocuments = (db: Db = prisma): RequestHandler => async (req, res) => {
  const q = req.valid!.query as z.infer<typeof publicContentQuery>;
  const where = {
    status: ContentStatus.PUBLISHED,
    ...(q.category && { category: q.category }),
  };

  const [rows, total] = await Promise.all([
    db.cmsDocument.findMany({
      where,
      select: { publicId: true, title: true, category: true, fileType: true, uploadDate: true },
      orderBy: { uploadDate: 'desc' },
      ...pageArgs(q),
    }),
    db.cmsDocument.count({ where }),
  ]);

  sendJson(res, paginated(rows, total, q));
};

export const listPublicGallery = (db: Db = prisma): RequestHandler => async (req, res) => {
  const q = req.valid!.query as z.infer<typeof publicContentQuery>;
  const where = {
    status: ContentStatus.PUBLISHED,
    ...(q.category && { category: q.category }),
  };

  const [rows, total] = await Promise.all([
    db.galleryImage.findMany({
      where,
      select: {
        publicId: true,
        imageTitle: true,
        description: true,
        category: true,
        uploadDate: true,
      },
      orderBy: { uploadDate: 'desc' },
      ...pageArgs(q),
    }),
    db.galleryImage.count({ where }),
  ]);

  sendJson(res, paginated(rows, total, q));
};
