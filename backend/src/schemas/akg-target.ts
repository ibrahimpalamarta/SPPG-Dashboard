import { z } from 'zod';
import { PendistribusianMbg } from '@prisma/client';
import { pageQuery } from '../lib/pagination.js';

/** Read-only lookup: the 12 rows come from Tabel 2 SOP-OPR-001 via
 * `npm run seed`, not from the API. */
export const akgTargetListQuery = pageQuery.extend({
  pendistribusianMbg: z.nativeEnum(PendistribusianMbg).optional(),
});
