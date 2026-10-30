-- SCRUM-42/43: kategori ternormalisasi + transfer internal. SCRUM-48: SLA pembayaran. SCRUM-46/49: tabel GR dan saldo tanpa writer (B-SRC-SKN).
-- Internal-only: tidak ada GRANT ke sppg_public.
-- CreateEnum
CREATE TYPE "PaymentSla" AS ENUM ('SAME_DAY', 'D_PLUS_1', 'BREACH', 'INVALID_SEQUENCE', 'UNKNOWN');

-- AlterTable
ALTER TABLE "finance_transactions" ADD COLUMN     "category_normalized" TEXT,
ADD COLUMN     "is_internal_transfer" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "vendor_payment_workflows" ADD COLUMN     "received_at" TIMESTAMP(3),
ADD COLUMN     "sla_status" "PaymentSla" NOT NULL DEFAULT 'UNKNOWN';

-- CreateTable
CREATE TABLE "goods_receipt_lines" (
    "id" BIGSERIAL NOT NULL,
    "upload_batch_id" UUID NOT NULL,
    "mapping_profile_id" TEXT NOT NULL,
    "kitchen_id" BIGINT NOT NULL,
    "source_record_id" TEXT NOT NULL,
    "source_system" "SourceSystem" NOT NULL,
    "source_file_name" TEXT NOT NULL,
    "template_version" TEXT,
    "loaded_at" TIMESTAMP(3) NOT NULL,
    "receipt_id" TEXT NOT NULL,
    "receipt_line_id" TEXT NOT NULL,
    "received_at" TIMESTAMP(3),
    "po_id" TEXT,
    "po_line_id" TEXT,
    "item_name" TEXT,
    "unit" TEXT,
    "ordered_qty" DECIMAL(14,3),
    "received_qty" DECIMAL(14,3),
    "qty_match_status" TEXT,
    "source_flag" TEXT,

    CONSTRAINT "goods_receipt_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_balances" (
    "id" BIGSERIAL NOT NULL,
    "upload_batch_id" UUID NOT NULL,
    "mapping_profile_id" TEXT NOT NULL,
    "kitchen_id" BIGINT NOT NULL,
    "source_record_id" TEXT NOT NULL,
    "source_system" "SourceSystem" NOT NULL,
    "source_file_name" TEXT NOT NULL,
    "template_version" TEXT,
    "loaded_at" TIMESTAMP(3) NOT NULL,
    "balance_date" DATE NOT NULL,
    "account_ref" TEXT NOT NULL,
    "balance" DECIMAL(16,2),

    CONSTRAINT "finance_balances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "goods_receipt_lines_kitchen_id_received_at_idx" ON "goods_receipt_lines"("kitchen_id", "received_at");

-- CreateIndex
CREATE INDEX "goods_receipt_lines_source_record_id_idx" ON "goods_receipt_lines"("source_record_id");

-- CreateIndex
CREATE UNIQUE INDEX "goods_receipt_lines_upload_batch_id_receipt_id_receipt_line_key" ON "goods_receipt_lines"("upload_batch_id", "receipt_id", "receipt_line_id");

-- CreateIndex
CREATE INDEX "finance_balances_kitchen_id_balance_date_idx" ON "finance_balances"("kitchen_id", "balance_date");

-- CreateIndex
CREATE UNIQUE INDEX "finance_balances_upload_batch_id_balance_date_account_ref_key" ON "finance_balances"("upload_batch_id", "balance_date", "account_ref");

-- AddForeignKey
ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_upload_batch_id_fkey" FOREIGN KEY ("upload_batch_id") REFERENCES "upload_batches"("public_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_kitchen_id_fkey" FOREIGN KEY ("kitchen_id") REFERENCES "kitchens"("kitchen_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_balances" ADD CONSTRAINT "finance_balances_upload_batch_id_fkey" FOREIGN KEY ("upload_batch_id") REFERENCES "upload_batches"("public_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_balances" ADD CONSTRAINT "finance_balances_kitchen_id_fkey" FOREIGN KEY ("kitchen_id") REFERENCES "kitchens"("kitchen_id") ON DELETE RESTRICT ON UPDATE CASCADE;

