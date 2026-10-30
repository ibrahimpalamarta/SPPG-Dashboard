-- SCRUM-78/95/96: lineage publish (superseded_by_batch_id per kunci bisnis, replaces_batch_id untuk koreksi). SCRUM-59/107: log pelaporan ke pemerintah.
-- Internal-only: tidak ada GRANT ke sppg_public.
-- CreateEnum
CREATE TYPE "GovernmentSystem" AS ENUM ('SIPGN', 'POP', 'AKSIS');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('SUBMITTED', 'ACCEPTED', 'REJECTED');

-- AlterTable
ALTER TABLE "upload_batches" ADD COLUMN     "replaces_batch_id" UUID;

-- AlterTable
ALTER TABLE "finance_transactions" ADD COLUMN     "superseded_by_batch_id" UUID;

-- AlterTable
ALTER TABLE "rab_daily_budgets" ADD COLUMN     "superseded_by_batch_id" UUID;

-- AlterTable
ALTER TABLE "vendor_payment_workflows" ADD COLUMN     "superseded_by_batch_id" UUID;

-- AlterTable
ALTER TABLE "menu_recipe_lines" ADD COLUMN     "superseded_by_batch_id" UUID;

-- CreateTable
CREATE TABLE "government_submission_logs" (
    "id" BIGSERIAL NOT NULL,
    "kitchen_id" BIGINT NOT NULL,
    "system" "GovernmentSystem" NOT NULL,
    "module" TEXT NOT NULL,
    "source_record_id" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL,
    "external_ref" TEXT,
    "note" TEXT,
    "recorded_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "government_submission_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "government_submission_logs_kitchen_id_submitted_at_idx" ON "government_submission_logs"("kitchen_id", "submitted_at");

-- CreateIndex
CREATE INDEX "government_submission_logs_source_record_id_idx" ON "government_submission_logs"("source_record_id");

-- CreateIndex
CREATE UNIQUE INDEX "government_submission_logs_system_module_source_record_id_key" ON "government_submission_logs"("system", "module", "source_record_id");

-- AddForeignKey
ALTER TABLE "government_submission_logs" ADD CONSTRAINT "government_submission_logs_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

