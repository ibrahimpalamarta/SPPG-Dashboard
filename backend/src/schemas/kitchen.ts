import { z } from 'zod';
import { ActiveStatus, KitchenType } from '@prisma/client';
import { pageQuery } from '../lib/pagination.js';

export const kitchenListQuery = pageQuery.extend({
  status: z.nativeEnum(ActiveStatus).optional(),
  type: z.nativeEnum(KitchenType).optional(),
  search: z.string().min(1).max(120).optional(),
});

/**
 * Region, type and coordinates stay optional: the master dapur file has not
 * been received, so all six seeded kitchens have them NULL (see
 * prisma/seeders/20260820010000-reference-data.ts). Requiring them here would
 * make the six existing rows uneditable.
 */
const kitchenFields = {
  name: z.string().min(1).max(120),
  province: z.string().max(120).nullish(),
  cityRegency: z.string().max(120).nullish(),
  district: z.string().max(120).nullish(),
  village: z.string().max(120).nullish(),
  type: z.nativeEnum(KitchenType).nullish(),
  status: z.nativeEnum(ActiveStatus).optional(),
  latitude: z.coerce.number().min(-90).max(90).nullish(),
  longitude: z.coerce.number().min(-180).max(180).nullish(),
};

export const kitchenCreate = z.object(kitchenFields);
export const kitchenUpdate = z.object(kitchenFields).partial();
