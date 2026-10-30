import type { Prisma, UploadDomain } from '@prisma/client';
import type { CashflowTxn } from './sukun-cashflow.js';
import type { RabDailyBudget } from './sukun-rab.js';
import type { InputMakerLine } from './input-maker.js';
import type { MenuRecipeLine } from './sukun-menu.js';

/** What an adapter produced for a batch, ready to store (B-MAPOUT: stored at upload). */
export type MappedRecords = {
  profileId: string;
  /** profile.version, stored as template_version (PRD §7.2). */
  templateVersion: string;
  loadedAt: Date;
  domain: UploadDomain;
  records: unknown[];
};

// Postgres caps a statement at 65535 bind parameters; the widest row here has ~13.
const CHUNK = 2000;

async function insertChunked<T>(rows: T[], insert: (chunk: T[]) => Promise<unknown>) {
  for (let i = 0; i < rows.length; i += CHUNK) await insert(rows.slice(i, i + CHUNK));
}

/**
 * Replaces the canonical rows of one batch: Cashflow → finance_transaction(+_line),
 * RAB → rab_daily_budget + rab_ingredient_budget, Input Maker →
 * vendor_payment_workflow, Menu → menu_recipe_line. Runs inside the staging
 * transaction, so staging and canonical rows are never half-written. Other
 * domains have no canonical table yet.
 */
export async function writeCanonical(tx: Prisma.TransactionClient, uploadBatchId: string, mapped: MappedRecords) {
  // Lines and ingredient budgets go with their parent (ON DELETE CASCADE).
  await tx.financeTransaction.deleteMany({ where: { uploadBatchId } });
  await tx.rabDailyBudget.deleteMany({ where: { uploadBatchId } });
  await tx.vendorPaymentWorkflow.deleteMany({ where: { uploadBatchId } });
  await tx.menuRecipeLine.deleteMany({ where: { uploadBatchId } });

  // PRD §7.2 traceability: kitchen_id, source_system and source_file_name are the batch's.
  const batch = await tx.uploadBatch.findUniqueOrThrow({
    where: { publicId: uploadBatchId },
    select: { kitchenId: true, sourceSystem: true, fileName: true },
  });
  const trace = {
    uploadBatchId,
    mappingProfileId: mapped.profileId,
    kitchenId: batch.kitchenId,
    sourceSystem: batch.sourceSystem,
    sourceFileName: batch.fileName,
    templateVersion: mapped.templateVersion,
    loadedAt: mapped.loadedAt,
  };
  if (mapped.domain === 'CASHFLOW') {
    const txns = mapped.records as CashflowTxn[];
    await insertChunked(txns, (chunk) =>
      tx.financeTransaction.createMany({
        data: chunk.map(({ lines, txn_date, txn_type, direction, category, description, txn_total, is_external_spend, review_status, review_note, confidence, txn_id }) => ({
          ...trace,
          // The transaction is traced to its first source row.
          sourceRecordId: lines[0]!.source_record_id,
          txnId: txn_id,
          txnDate: txn_date ? new Date(txn_date) : null,
          txnType: txn_type,
          direction,
          category,
          description,
          txnTotal: txn_total,
          isExternalSpend: is_external_spend,
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
  } else if (mapped.domain === 'INPUT_MAKER') {
    // Workflow times, paid amount and payment reference stay NULL: TAGIHAN/TANGGAL are not evidence of payment (OD-14).
    await insertChunked(mapped.records as InputMakerLine[], (chunk) =>
      tx.vendorPaymentWorkflow.createMany({
        data: chunk.map((l) => ({
          ...trace,
          sourceRecordId: l.source_record_id,
          paymentRequestId: l.payment_request_id,
          requestDate: l.request_date ? new Date(l.request_date) : null,
          description: l.description,
          category: l.category,
          supplierName: l.supplier,
          requestAmount: l.request_amount,
          checklist: l.checklist,
          supplierInvoiceLink: l.supplier_invoice_link,
          paymentInvoiceLink: l.payment_invoice_link,
        })),
      }),
    );
  } else if (mapped.domain === 'MENU') {
    await insertChunked(mapped.records as MenuRecipeLine[], (chunk) =>
      tx.menuRecipeLine.createMany({
        data: chunk.map((l) => ({
          ...trace,
          sourceRecordId: l.source_record_id,
          period: l.period,
          servingDate: l.serving_date ? new Date(l.serving_date) : null,
          menuType: l.menu_type,
          portionSegment: l.portion_segment,
          menuName: l.menu_name,
          ingredient: l.ingredient,
          urtUnit: l.urt_unit,
          urtQty: l.urt_qty,
          grossWeightG: l.gross_weight_g,
          netWeightG: l.net_weight_g,
          ediblePortionPct: l.edible_portion_pct,
          energyKcal: l.energy_kcal,
          proteinG: l.protein_g,
          fatG: l.fat_g,
          carbohydrateG: l.carbohydrate_g,
          fiberG: l.fiber_g,
          plannedPortions: l.beneficiaries,
          ingredientNeedKg: l.ingredient_need_kg,
          packagedNeedPax: l.packaged_need_pax,
          unitPrice: l.unit_price,
          lineTotal: l.line_total,
        })),
      }),
    );
  } else if (mapped.domain === 'RAB') {
    const days = mapped.records as RabDailyBudget[];
    // One round trip per chunk of days: the ids are needed for the ingredient rows.
    for (let i = 0; i < days.length; i += CHUNK) {
      const chunk = days.slice(i, i + CHUNK);
      const created = await tx.rabDailyBudget.createManyAndReturn({
        data: chunk.map((d) => ({
          ...trace,
          sourceRecordId: d.lines[0]!.source_record_id,
          budgetDate: new Date(d.budget_date),
          portionSegment: d.portion_segment,
          plannedCost: d.planned_cost,
          packageCount: d.package_count,
        })),
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
