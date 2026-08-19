import { z } from 'zod';
import { MenuType, PortionClass } from '@prisma/client';
import { pageQuery } from '../lib/pagination.js';
import { dateRangeFields, optionalBigInt, refineDateRange } from './common.js';

/** SCRUM-2. Read-only: rows arrive through the Excel import, not by hand, so
 * there is no create/update schema here. */
export const menuPlanListQuery = refineDateRange(
  pageQuery.extend({
    ...dateRangeFields,
    kitchenId: optionalBigInt,
    uploadBatchId: optionalBigInt,
    portionClass: z.nativeEnum(PortionClass).optional(),
    menuType: z.nativeEnum(MenuType).optional(),
    search: z.string().min(1).max(160).optional(),
  }),
);
