-- SCRUM-66: flag transfer EFI. SCRUM-50/72: beneficiary_daily_counts agregat tanpa kolom PII, tanpa writer (B-SRC-SKN). SCRUM-78: lineage finance_balances.
-- Internal-only: tidak ada GRANT ke sppg_public.
-- AlterTable
ALTER TABLE "finance_transactions" ADD COLUMN     "is_efi_transfer" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "finance_balances" ADD COLUMN     "superseded_by_batch_id" UUID;

-- CreateTable
CREATE TABLE "beneficiary_daily_counts" (
    "id" BIGSERIAL NOT NULL,
    "upload_batch_id" UUID NOT NULL,
    "mapping_profile_id" TEXT NOT NULL,
    "kitchen_id" BIGINT NOT NULL,
    "source_record_id" TEXT NOT NULL,
    "source_system" "SourceSystem" NOT NULL,
    "source_file_name" TEXT NOT NULL,
    "template_version" TEXT,
    "loaded_at" TIMESTAMP(3) NOT NULL,
    "count_date" DATE NOT NULL,
    "location_ref" TEXT NOT NULL,
    "segment" TEXT NOT NULL,
    "planned_count" INTEGER,
    "actual_count" INTEGER,
    "superseded_by_batch_id" UUID,

    CONSTRAINT "beneficiary_daily_counts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "beneficiary_daily_counts_kitchen_id_count_date_idx" ON "beneficiary_daily_counts"("kitchen_id", "count_date");

-- CreateIndex
CREATE UNIQUE INDEX "beneficiary_daily_counts_upload_batch_id_count_date_locatio_key" ON "beneficiary_daily_counts"("upload_batch_id", "count_date", "location_ref", "segment");

-- AddForeignKey
ALTER TABLE "beneficiary_daily_counts" ADD CONSTRAINT "beneficiary_daily_counts_upload_batch_id_fkey" FOREIGN KEY ("upload_batch_id") REFERENCES "upload_batches"("public_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficiary_daily_counts" ADD CONSTRAINT "beneficiary_daily_counts_kitchen_id_fkey" FOREIGN KEY ("kitchen_id") REFERENCES "kitchens"("kitchen_id") ON DELETE RESTRICT ON UPDATE CASCADE;

