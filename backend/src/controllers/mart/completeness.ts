import type { RequestHandler } from 'express';
import type { z } from 'zod';
import { prisma, type Db } from '../../db.js';
import { sendError } from '../../middleware/error-handler.js';
import { sendJson } from '../../lib/serialize.js';
import { kitchenScope, kitchenWhere } from '../../lib/scope.js';
import { kitchenCompleteness, type BatchRow } from '../../lib/completeness.js';
import type { completenessQuery } from '../../schemas/mart.js';

/**
 * SCRUM-104: per dapur, which of the six required data have been delivered
 * and published. Read-only, inside the caller's dapur scope.
 */
export const getCompleteness = (db: Db = prisma): RequestHandler => async (req, res) => {
  const q = req.valid!.query as z.infer<typeof completenessQuery>;
  const scope = kitchenScope(req.user!, q.kitchenId);
  if (!scope.ok) {
    sendError(res, 'FORBIDDEN_KITCHEN');
    return;
  }
  const where = kitchenWhere(scope);
  const live = { ...where, supersededByBatchId: null, uploadBatch: { status: 'PUBLISHED' as const } };

  const [kitchens, batches, beneficiaries, balances] = await Promise.all([
    db.kitchen.findMany({
      where: { status: 'ACTIVE', ...(scope.kitchenIds && { id: { in: scope.kitchenIds } }) },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, cityRegency: true },
    }),
    db.uploadBatch.findMany({ where, select: { kitchenId: true, domain: true, status: true, uploadDate: true, publishedAt: true } }),
    db.beneficiaryDailyCount.groupBy({ by: ['kitchenId'], where: live }),
    db.financeBalance.groupBy({ by: ['kitchenId'], where: live }),
  ]);

  const byKitchen = new Map<bigint, BatchRow[]>();
  for (const { kitchenId, ...row } of batches) byKitchen.set(kitchenId, [...(byKitchen.get(kitchenId) ?? []), row]);
  const hasBeneficiaries = new Set(beneficiaries.map((b) => b.kitchenId));
  const hasBalances = new Set(balances.map((b) => b.kitchenId));

  sendJson(res, {
    kitchens: kitchens.map((k) => ({
      name: k.name,
      region: k.cityRegency,
      ...kitchenCompleteness({
        batches: byKitchen.get(k.id) ?? [],
        liveLabels: new Set([...(hasBeneficiaries.has(k.id) ? ['Jumlah Penerima Manfaat'] : []), ...(hasBalances.has(k.id) ? ['Saldo Rekening'] : [])]),
      }),
    })),
  });
};
