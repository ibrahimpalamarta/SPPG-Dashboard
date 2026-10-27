-- SCRUM-27/55/98/44/28: hasil mapping Cashflow + RAB disimpan saat upload (B-MAPOUT). Internal-only: tidak ada GRANT ke sppg_public.
-- CreateTable
CREATE TABLE "finance_transactions" (
    "id" BIGSERIAL NOT NULL,
    "upload_batch_id" UUID NOT NULL,
    "mapping_profile_id" TEXT NOT NULL,
    "txn_id" TEXT NOT NULL,
    "txn_date" DATE,
    "txn_type" TEXT,
    "direction" TEXT,
    "category" TEXT,
    "description" TEXT,
    "txn_total" DECIMAL(14,2),
    "review_status" TEXT,
    "review_note" TEXT,
    "confidence" TEXT,

    CONSTRAINT "finance_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_transaction_lines" (
    "id" BIGSERIAL NOT NULL,
    "upload_batch_id" UUID NOT NULL,
    "txn_id" TEXT NOT NULL,
    "source_record_id" TEXT NOT NULL,
    "line_id" TEXT,
    "item_name" TEXT,
    "counterparty" TEXT,
    "qty" DECIMAL(14,3),
    "unit" TEXT,
    "unit_price" DECIMAL(14,2),
    "line_amount" DECIMAL(14,2),

    CONSTRAINT "finance_transaction_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rab_daily_budgets" (
    "id" BIGSERIAL NOT NULL,
    "upload_batch_id" UUID NOT NULL,
    "mapping_profile_id" TEXT NOT NULL,
    "budget_date" DATE NOT NULL,
    "portion_segment" TEXT NOT NULL,
    "planned_cost" DECIMAL(16,2) NOT NULL,

    CONSTRAINT "rab_daily_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rab_ingredient_budgets" (
    "id" BIGSERIAL NOT NULL,
    "daily_budget_id" BIGINT NOT NULL,
    "source_record_id" TEXT NOT NULL,
    "menu_type" TEXT,
    "menu_name" TEXT,
    "ingredient" TEXT,
    "unit_price" DECIMAL(14,2),
    "line_total" DECIMAL(16,2),
    "beneficiaries" DECIMAL(14,2),
    "ingredient_need_kg" DECIMAL(14,3),
    "packaged_need_pax" DECIMAL(14,2),

    CONSTRAINT "rab_ingredient_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "finance_transactions_txn_date_idx" ON "finance_transactions"("txn_date");

-- CreateIndex
CREATE UNIQUE INDEX "finance_transactions_upload_batch_id_txn_id_key" ON "finance_transactions"("upload_batch_id", "txn_id");

-- CreateIndex
CREATE UNIQUE INDEX "finance_transaction_lines_source_record_id_key" ON "finance_transaction_lines"("source_record_id");

-- CreateIndex
CREATE INDEX "finance_transaction_lines_upload_batch_id_txn_id_idx" ON "finance_transaction_lines"("upload_batch_id", "txn_id");

-- CreateIndex
CREATE UNIQUE INDEX "rab_daily_budgets_upload_batch_id_budget_date_portion_segme_key" ON "rab_daily_budgets"("upload_batch_id", "budget_date", "portion_segment");

-- CreateIndex
CREATE UNIQUE INDEX "rab_ingredient_budgets_source_record_id_key" ON "rab_ingredient_budgets"("source_record_id");

-- CreateIndex
CREATE INDEX "rab_ingredient_budgets_daily_budget_id_idx" ON "rab_ingredient_budgets"("daily_budget_id");

-- AddForeignKey
ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_upload_batch_id_fkey" FOREIGN KEY ("upload_batch_id") REFERENCES "upload_batches"("public_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_transaction_lines" ADD CONSTRAINT "finance_transaction_lines_upload_batch_id_txn_id_fkey" FOREIGN KEY ("upload_batch_id", "txn_id") REFERENCES "finance_transactions"("upload_batch_id", "txn_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rab_daily_budgets" ADD CONSTRAINT "rab_daily_budgets_upload_batch_id_fkey" FOREIGN KEY ("upload_batch_id") REFERENCES "upload_batches"("public_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rab_ingredient_budgets" ADD CONSTRAINT "rab_ingredient_budgets_daily_budget_id_fkey" FOREIGN KEY ("daily_budget_id") REFERENCES "rab_daily_budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

