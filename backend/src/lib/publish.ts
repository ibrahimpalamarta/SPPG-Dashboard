import { Prisma } from '@prisma/client';

/**
 * SCRUM-54: review_status values a KPI may count. Baseline (PRD AC-DQ):
 * TERKONFIRMASI only. Rows outside it are kept and stay visible in Validasi
 * Data; they are just not eligible for production KPIs.
 *
 * ponytail: a code constant, changed by deploy. Move to Data Reference if
 * Finance needs to change it without a release.
 */
export const ELIGIBLE_REVIEW_STATUSES = ['TERKONFIRMASI'];

/**
 * SCRUM-78: the business key of each canonical table. Publishing a batch marks
 * every row of an *earlier published* batch with the same key as superseded by
 * it, so a re-upload never double-counts and the old rows stay queryable
 * (lineage). Nullable key columns compare with IS NOT DISTINCT FROM.
 *
 * txn_id carries the date because Sukun numbers transactions per period
 * ("TXN-B0001" again next month); a correction that changes the date is
 * covered by `replaces`, which closes the whole old batch.
 */
const SUPERSEDE = [
  ['finance_transactions', ['txn_id', 'txn_date']],
  ['rab_daily_budgets', ['budget_date', 'portion_segment']],
  ['menu_recipe_lines', ['serving_date', 'portion_segment', 'menu_name', 'ingredient']],
  ['vendor_payment_workflows', ['payment_request_id']],
  ['beneficiary_daily_counts', ['count_date', 'location_ref', 'segment']],
  ['finance_balances', ['balance_date', 'account_ref']],
] as const;

export type SupersedeCounts = Record<(typeof SUPERSEDE)[number][0], number>;

export async function supersedePublished(tx: Pick<Prisma.TransactionClient, '$executeRaw'>, uploadBatchId: string): Promise<SupersedeCounts> {
  const counts = {} as SupersedeCounts;
  for (const [table, keys] of SUPERSEDE) {
    const sameKey = Prisma.join(
      keys.map((k) => Prisma.sql`o.${Prisma.raw(`"${k}"`)} IS NOT DISTINCT FROM n.${Prisma.raw(`"${k}"`)}`),
      ' AND ',
    );
    counts[table] = await tx.$executeRaw`
      UPDATE ${Prisma.raw(`"${table}"`)} o
         SET superseded_by_batch_id = ${uploadBatchId}::uuid
        FROM ${Prisma.raw(`"${table}"`)} n
       WHERE n.upload_batch_id = ${uploadBatchId}::uuid
         AND o.kitchen_id = n.kitchen_id
         AND ${sameKey}
         AND o.upload_batch_id <> n.upload_batch_id
         AND o.superseded_by_batch_id IS NULL
         AND o.upload_batch_id IN (SELECT public_id FROM upload_batches WHERE status = 'PUBLISHED')`;
  }
  return counts;
}
