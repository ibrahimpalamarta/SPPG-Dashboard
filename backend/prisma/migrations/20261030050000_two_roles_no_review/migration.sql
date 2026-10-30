-- SCRUM-152/148: dua role (ADMIN, DATA_ADMIN) dan tanpa tahap review Admin.

-- Akun role lain (MANAGEMENT, FINANCE, KEPALA_KITCHEN, AHLI_GIZI, DATA_STEWARD)
-- tidak punya padanan: dinonaktifkan, sesinya dicabut. Role-nya dipindah ke
-- DATA_ADMIN supaya kolomnya tetap valid.
UPDATE "users" SET "status" = 'INACTIVE'
WHERE "role" IN ('MANAGEMENT', 'FINANCE', 'KEPALA_KITCHEN', 'AHLI_GIZI', 'DATA_STEWARD');
DELETE FROM "sessions" WHERE "user_id" IN (SELECT "user_id" FROM "users" WHERE "status" = 'INACTIVE');

CREATE TYPE "Role_new" AS ENUM ('ADMIN', 'DATA_ADMIN');

DELETE FROM "role_permissions";

ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role_new" USING (
  CASE "role"::text WHEN 'SUPER_ADMIN' THEN 'ADMIN' ELSE 'DATA_ADMIN' END
)::"Role_new";
ALTER TABLE "role_permissions" ALTER COLUMN "role" TYPE "Role_new" USING "role"::text::"Role_new";

DROP TYPE "Role";
ALTER TYPE "Role_new" RENAME TO "Role";

-- ADMIN tidak di-seed (selalu memegang semua kecuali upload/publish).
INSERT INTO "role_permissions" ("role", "permission") VALUES
  ('DATA_ADMIN', 'upload:create'),
  ('DATA_ADMIN', 'upload:view'),
  ('DATA_ADMIN', 'batch:publish'),
  ('DATA_ADMIN', 'mapping:view'),
  ('DATA_ADMIN', 'mapping:propose'),
  ('DATA_ADMIN', 'reference:view'),
  ('DATA_ADMIN', 'dashboard:view');

-- Tidak ada lagi "Menunggu Review PM" / "Dikembalikan": batch READY kembali ke
-- NEEDS_REVIEW (Data Operasional yang mem-publish), catatan pengembalian dihapus.
UPDATE "upload_batches" SET "status" = 'NEEDS_REVIEW', "validated_at" = NULL WHERE "status" = 'READY';
UPDATE "upload_batches" SET "error_code" = NULL, "error_summary" = NULL WHERE "error_code" = 'RETURNED';

CREATE TYPE "UploadStatus_new" AS ENUM ('PROCESSING', 'NEEDS_REVIEW', 'NEEDS_MAPPING_UPDATE', 'PUBLISHED', 'FAILED', 'SUPERSEDED');
ALTER TABLE "upload_batches" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "upload_batches" ALTER COLUMN "status" TYPE "UploadStatus_new" USING "status"::text::"UploadStatus_new";
ALTER TABLE "upload_batches" ALTER COLUMN "status" SET DEFAULT 'PROCESSING';
DROP TYPE "UploadStatus";
ALTER TYPE "UploadStatus_new" RENAME TO "UploadStatus";
