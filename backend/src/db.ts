import { PrismaClient } from '@prisma/client';
import { env } from './config/env.js';

// `error`/`warn` only: `query` logging would put row values into CloudWatch.
const log: ('warn' | 'error')[] = env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'];

export const prisma = new PrismaClient({ log });

/**
 * SCRUM-13 AC3. The connection `/api/public/*` runs on: the `sppg_public`
 * Postgres role, which holds SELECT on the two public views, `public_summaries`
 * and the three CMS tables — and on nothing else. A query for `menu_costs` on
 * this client fails at the database, not at a code review.
 *
 * Falls back to the main client when unset so a fresh clone runs before anyone
 * has provisioned the role. `config/env.ts` refuses to boot production that
 * way, which is where the fallback would actually matter.
 */
export const publicDb: Db = env.DATABASE_URL_PUBLIC
  ? new PrismaClient({ log, datasourceUrl: env.DATABASE_URL_PUBLIC })
  : prisma;

if (!env.DATABASE_URL_PUBLIC) {
  console.warn('DATABASE_URL_PUBLIC unset: /api/public/* runs with full database privileges.');
}

/**
 * The slice of PrismaClient the application needs — lets tests pass a stub
 * instead of a live database. Widen this as new models get endpoints; keeping
 * it explicit is what makes a hand-written stub type-check.
 */
export type Db = Pick<
  PrismaClient,
  // The two public views are not modelled in schema.prisma, so the public
  // dashboard reaches them through a raw query.
  | '$queryRaw'
  | 'user'
  | 'auditLog'
  | 'kitchen'
  | 'ingredient'
  | 'akgTarget'
  | 'uploadBatch'
  | 'menuPlan'
  | 'recipeCosting'
  | 'akgCompliance'
  | 'menuNutrition'
  | 'dailyKitchen'
  | 'menuCost'
  | 'publicSummary'
  | 'cmsAnnouncement'
  | 'cmsDocument'
  | 'galleryImage'
>;
