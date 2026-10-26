-- SCRUM-22 + SCRUM-37: metadata umum batch unggahan dan status PRD FR-UP-05.
--
-- Data lama dipetakan, bukan dibuang:
--   DITERIMA   -> PUBLISHED  (barisnya sudah masuk menu_plans)
--   DITOLAK    -> FAILED
--   PROCESSING -> PROCESSING
-- Semua batch lama adalah berkas menu (satu-satunya domain sebelum ini), dan
-- yang DITERIMA tersimpan di S3 pada key turunan hash `upload-batches/<hash>.xlsx`.

-- CreateEnum
CREATE TYPE "UploadDomain" AS ENUM ('CASHFLOW', 'MENU', 'RAB', 'PO', 'GOODS_RECEIPT', 'VENDOR_PAYMENT', 'INPUT_MAKER');

-- CreateEnum
CREATE TYPE "SourceSystem" AS ENUM ('INTERNAL', 'EFI', 'SIPGN', 'POP', 'AKSIS', 'MPM', 'WEB_MANUAL');

-- AlterEnum
CREATE TYPE "UploadStatus_new" AS ENUM ('PROCESSING', 'NEEDS_REVIEW', 'NEEDS_MAPPING_UPDATE', 'READY', 'PUBLISHED', 'FAILED');
ALTER TABLE "upload_batches" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "upload_batches" ALTER COLUMN "status" TYPE "UploadStatus_new" USING (
  CASE "status"::text
    WHEN 'DITERIMA' THEN 'PUBLISHED'
    WHEN 'DITOLAK' THEN 'FAILED'
    ELSE "status"::text
  END::"UploadStatus_new"
);
ALTER TYPE "UploadStatus" RENAME TO "UploadStatus_old";
ALTER TYPE "UploadStatus_new" RENAME TO "UploadStatus";
DROP TYPE "UploadStatus_old";
ALTER TABLE "upload_batches" ALTER COLUMN "status" SET DEFAULT 'PROCESSING';

-- DropIndex
DROP INDEX "upload_batches_file_hash_key";

-- AlterTable
ALTER TABLE "upload_batches" ADD COLUMN     "domain" "UploadDomain" NOT NULL DEFAULT 'MENU',
ADD COLUMN     "duration_ms" INTEGER,
ADD COLUMN     "error_code" TEXT,
ADD COLUMN     "error_summary" TEXT,
ADD COLUMN     "file_size" INTEGER,
ADD COLUMN     "mapping_profile_id" TEXT,
ADD COLUMN     "period" TEXT,
ADD COLUMN     "public_id" UUID NOT NULL DEFAULT gen_random_uuid(),
ADD COLUMN     "published_at" TIMESTAMP(3),
ADD COLUMN     "source_system" "SourceSystem" NOT NULL DEFAULT 'INTERNAL',
ADD COLUMN     "storage_key" TEXT,
ADD COLUMN     "template_version" TEXT,
ADD COLUMN     "validated_at" TIMESTAMP(3),
ALTER COLUMN "row_count" SET DEFAULT 0;

-- The default only existed to backfill the rows above; new batches must name
-- their domain.
ALTER TABLE "upload_batches" ALTER COLUMN "domain" DROP DEFAULT;

-- Backfill
UPDATE "upload_batches"
SET "storage_key" = 'upload-batches/' || "file_hash" || '.xlsx'
WHERE "status" = 'PUBLISHED';

-- CreateIndex
CREATE UNIQUE INDEX "upload_batches_public_id_key" ON "upload_batches"("public_id");

-- CreateIndex
CREATE INDEX "upload_batches_kitchen_id_domain_upload_date_idx" ON "upload_batches"("kitchen_id", "domain", "upload_date");

-- CreateIndex
CREATE INDEX "upload_batches_file_hash_idx" ON "upload_batches"("file_hash");
