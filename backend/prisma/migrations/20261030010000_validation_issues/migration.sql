-- SCRUM-33/51/68: temuan rule DQ per baris, severity + karantina. SCRUM-53: baris RAB tanpa total dihitung, bukan dianggap 0.
-- Internal-only: tidak ada GRANT ke sppg_public.
-- CreateEnum
CREATE TYPE "IssueSeverity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM');

-- CreateEnum
CREATE TYPE "IssueAction" AS ENUM ('REJECT', 'REVIEW', 'NORMALIZE', 'FLAG');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('OPEN', 'RESOLVED');

-- AlterTable
ALTER TABLE "rab_daily_budgets" ADD COLUMN     "missing_line_totals" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "validation_issues" (
    "id" BIGSERIAL NOT NULL,
    "upload_batch_id" UUID NOT NULL,
    "kitchen_id" BIGINT NOT NULL,
    "code" TEXT NOT NULL,
    "rule_id" TEXT,
    "severity" "IssueSeverity" NOT NULL,
    "action" "IssueAction" NOT NULL,
    "source_record_id" TEXT,
    "message" TEXT NOT NULL,
    "status" "IssueStatus" NOT NULL DEFAULT 'OPEN',
    "note" TEXT,
    "resolved_by" BIGINT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "validation_issues_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "validation_issues_upload_batch_id_status_severity_idx" ON "validation_issues"("upload_batch_id", "status", "severity");

-- CreateIndex
CREATE INDEX "validation_issues_kitchen_id_status_severity_idx" ON "validation_issues"("kitchen_id", "status", "severity");

-- CreateIndex
CREATE INDEX "validation_issues_source_record_id_idx" ON "validation_issues"("source_record_id");

-- AddForeignKey
ALTER TABLE "validation_issues" ADD CONSTRAINT "validation_issues_upload_batch_id_fkey" FOREIGN KEY ("upload_batch_id") REFERENCES "upload_batches"("public_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validation_issues" ADD CONSTRAINT "validation_issues_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

