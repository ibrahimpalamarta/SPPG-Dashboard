import { z } from 'zod';
import { ComplianceStatus, OperationalStatus, PortionClass } from '@prisma/client';
import { pageQuery } from '../lib/pagination.js';
import { dateRangeFields, optionalBigInt, refineDateRange } from './common.js';

/**
 * Query shapes for the pre-computed marts. All read-only: these tables are
 * derived, and the refresh job that fills them is not built yet — expect empty
 * pages until it is.
 */
export const menuNutritionQuery = refineDateRange(
  pageQuery.extend({
    ...dateRangeFields,
    kitchenId: optionalBigInt,
    portionClass: z.nativeEnum(PortionClass).optional(),
  }),
);

export const dailyKitchenQuery = refineDateRange(
  pageQuery.extend({
    ...dateRangeFields,
    kitchenId: optionalBigInt,
    operationalStatus: z.nativeEnum(OperationalStatus).optional(),
  }),
);

export const menuCostQuery = refineDateRange(
  pageQuery.extend({
    ...dateRangeFields,
    kitchenId: optionalBigInt,
    menuPlanId: optionalBigInt,
  }),
);

export const akgComplianceQuery = pageQuery.extend({
  menuPlanId: optionalBigInt,
  kitchenId: optionalBigInt,
  status: z.nativeEnum(ComplianceStatus).optional(),
});

export const summaryQuery = refineDateRange(pageQuery.extend(dateRangeFields));

/** Bounds for the internal dashboard rollup. */
export const dashboardQuery = refineDateRange(
  z.object({ ...dateRangeFields, kitchenId: optionalBigInt }),
);

/** SCRUM-104: completeness per dapur, optionally narrowed to one. */
export const completenessQuery = z.object({ kitchenId: optionalBigInt });

/** SCRUM-115: menu KPIs also filter by region (kitchens.city_regency). */
export const menuKpiQuery = refineDateRange(
  z.object({ ...dateRangeFields, kitchenId: optionalBigInt, region: z.string().trim().min(1).max(100).optional() }),
);
