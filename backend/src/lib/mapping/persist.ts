import type { Prisma, UploadDomain } from '@prisma/client';
import type { CashflowTxn } from './sukun-cashflow.js';
import type { RabDailyBudget } from './sukun-rab.js';

/** What an adapter produced for a batch, ready to store (B-MAPOUT: stored at upload). */
export type MappedRecords = { profileId: string; domain: UploadDomain; records: unknown[] };

// Postgres caps a statement at 65535 bind parameters; the widest row here has ~13.
const CHUNK = 2000;

async function insertChunked<T>(rows: T[], insert: (chunk: T[]) => Promise<unknown>) {
  for (let i = 0; i < rows.length; i += CHUNK) await insert(rows.slice(i, i + CHUNK));
}

/**
 * Replaces the canonical rows of one batch: Cashflow → finance_transaction(+_line),
 * RAB → rab_daily_budget + rab_ingredient_budget. Runs inside the staging
 * transaction, so staging and canonical rows are never half-written. Other
 * domains have no canonical table yet.
 */
export async function writeCanonical(tx: Prisma.TransactionClient, uploadBatchId: string, mapped: MappedRecords) {
  // Lines and ingredient budgets go with their parent (ON DELETE CASCADE).
  await tx.financeTransaction.deleteMany({ where: { uploadBatchId } });
  await tx.rabDailyBudget.deleteMany({ where: { uploadBatchId } });

  const { profileId: mappingProfileId } = mapped;
  if (mapped.domain === 'CASHFLOW') {
    const txns = mapped.records as CashflowTxn[];
    await insertChunked(txns, (chunk) =>
      tx.financeTransaction.createMany({
        data: chunk.map(({ lines: _lines, txn_date, txn_type, direction, category, description, txn_total, review_status, review_note, confidence, txn_id }) => ({
          uploadBatchId,
          mappingProfileId,
          txnId: txn_id,
          txnDate: txn_date ? new Date(txn_date) : null,
          txnType: txn_type,
          direction,
          category,
          description,
          txnTotal: txn_total,
          reviewStatus: review_status,
          reviewNote: review_note,
          confidence,
        })),
      }),
    );
    await insertChunked(
      txns.flatMap((t) => t.lines.map((l) => ({ t, l }))),
      (chunk) =>
        tx.financeTransactionLine.createMany({
          data: chunk.map(({ t, l }) => ({
            uploadBatchId,
            txnId: t.txn_id,
            sourceRecordId: l.source_record_id,
            lineId: l.line_id,
            itemName: l.item_name,
            counterparty: l.counterparty,
            qty: l.qty,
            unit: l.unit,
            unitPrice: l.unit_price,
            lineAmount: l.line_amount,
          })),
        }),
    );
  } else if (mapped.domain === 'RAB') {
    const days = mapped.records as RabDailyBudget[];
    // One round trip per chunk of days: the ids are needed for the ingredient rows.
    for (let i = 0; i < days.length; i += CHUNK) {
      const chunk = days.slice(i, i + CHUNK);
      const created = await tx.rabDailyBudget.createManyAndReturn({
        data: chunk.map((d) => ({ uploadBatchId, mappingProfileId, budgetDate: new Date(d.budget_date), portionSegment: d.portion_segment, plannedCost: d.planned_cost })),
        select: { id: true, budgetDate: true, portionSegment: true },
      });
      const idOf = new Map(created.map((c) => [`${c.budgetDate.toISOString().slice(0, 10)}|${c.portionSegment}`, c.id]));
      await insertChunked(
        chunk.flatMap((d) => d.lines.map((l) => ({ dailyBudgetId: idOf.get(`${d.budget_date}|${d.portion_segment}`)!, l }))),
        (lines) =>
          tx.rabIngredientBudget.createMany({
            data: lines.map(({ dailyBudgetId, l }) => ({
              dailyBudgetId,
              sourceRecordId: l.source_record_id,
              menuType: l.menu_type,
              menuName: l.menu_name,
              ingredient: l.ingredient,
              unitPrice: l.unit_price,
              lineTotal: l.line_total,
              beneficiaries: l.beneficiaries,
              ingredientNeedKg: l.ingredient_need_kg,
              packagedNeedPax: l.packaged_need_pax,
            })),
          }),
      );
    }
  }
}
