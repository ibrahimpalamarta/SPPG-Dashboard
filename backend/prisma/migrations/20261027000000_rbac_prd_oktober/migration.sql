-- RBAC mengikuti PRD Oktober 2026 §3: INTERNAL / CMS_ADMIN / PUBLIC diganti
-- MANAGEMENT, FINANCE, KEPALA_KITCHEN, AHLI_GIZI, DATA_STEWARD (DATA_ADMIN dan
-- SUPER_ADMIN tetap).

-- Akun CMS_ADMIN / PUBLIC tidak punya padanan di PRD: dinonaktifkan, sesinya
-- dicabut. Role-nya dipindah ke KEPALA_KITCHEN (tanpa scope dapur = tidak
-- melihat data apa pun) supaya kolomnya tetap valid.
UPDATE "users" SET "status" = 'INACTIVE' WHERE "role" IN ('CMS_ADMIN', 'PUBLIC');
DELETE FROM "sessions" WHERE "user_id" IN (SELECT "user_id" FROM "users" WHERE "role" IN ('CMS_ADMIN', 'PUBLIC'));

CREATE TYPE "Role_new" AS ENUM (
  'SUPER_ADMIN', 'MANAGEMENT', 'FINANCE', 'KEPALA_KITCHEN', 'DATA_ADMIN', 'AHLI_GIZI', 'DATA_STEWARD'
);

DELETE FROM "role_permissions";

ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role_new" USING (
  CASE "role"::text
    WHEN 'INTERNAL' THEN 'MANAGEMENT'
    WHEN 'CMS_ADMIN' THEN 'KEPALA_KITCHEN'
    WHEN 'PUBLIC' THEN 'KEPALA_KITCHEN'
    ELSE "role"::text
  END
)::"Role_new";
ALTER TABLE "role_permissions" ALTER COLUMN "role" TYPE "Role_new" USING "role"::text::"Role_new";

DROP TYPE "Role";
ALTER TYPE "Role_new" RENAME TO "Role";

-- Peta role -> permission awal (PRD §3). SUPER_ADMIN tidak di-seed. Dapat
-- diubah lewat PUT /api/admin/roles/:role/permissions (hak upload: PRD OD-07).
INSERT INTO "role_permissions" ("role", "permission") VALUES
  ('MANAGEMENT', 'dashboard:view'),
  ('MANAGEMENT', 'upload:view'),
  ('MANAGEMENT', 'mapping:view'),
  ('MANAGEMENT', 'reference:view'),
  ('FINANCE', 'dashboard:view'),
  ('FINANCE', 'upload:view'),
  ('FINANCE', 'mapping:view'),
  ('FINANCE', 'reference:view'),
  ('KEPALA_KITCHEN', 'dashboard:view'),
  ('KEPALA_KITCHEN', 'upload:view'),
  ('KEPALA_KITCHEN', 'mapping:view'),
  ('KEPALA_KITCHEN', 'reference:view'),
  ('DATA_ADMIN', 'upload:create'),
  ('DATA_ADMIN', 'upload:view'),
  ('DATA_ADMIN', 'mapping:view'),
  ('DATA_ADMIN', 'mapping:propose'),
  ('DATA_ADMIN', 'reference:view'),
  ('DATA_ADMIN', 'dashboard:view'),
  ('AHLI_GIZI', 'dashboard:view'),
  ('AHLI_GIZI', 'upload:view'),
  ('AHLI_GIZI', 'mapping:view'),
  ('AHLI_GIZI', 'mapping:propose'),
  ('AHLI_GIZI', 'reference:view'),
  ('DATA_STEWARD', 'dashboard:view'),
  ('DATA_STEWARD', 'upload:create'),
  ('DATA_STEWARD', 'upload:view'),
  ('DATA_STEWARD', 'batch:review'),
  ('DATA_STEWARD', 'batch:publish'),
  ('DATA_STEWARD', 'mapping:view'),
  ('DATA_STEWARD', 'mapping:propose'),
  ('DATA_STEWARD', 'reference:view'),
  ('DATA_STEWARD', 'reference:edit'),
  ('DATA_STEWARD', 'audit:read');
