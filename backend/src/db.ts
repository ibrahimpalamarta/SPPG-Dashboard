import { PrismaClient } from '@prisma/client';
import { env } from './config/env.js';

// `error`/`warn` only: `query` logging would put row values into CloudWatch.
export const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

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
