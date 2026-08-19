-- =========================================================================
-- reshape_to_erd
--
-- Membentuk ulang domain operasional agar sesuai `sppg_erd.drawio` (15 entitas).
-- Model lama disusun dari PRD 10 dan tidak lagi cocok: penjadwalan menu kini
-- hidup di menu_plans (satu baris per bahan, mengikuti form SOP-OPR-001),
-- rekap dashboard pindah ke lima tabel mart, dan biaya dipisah tegas dari
-- angka yang boleh dilihat publik.
--
-- Tabel yang dibuang: menus, nutritions, transactions, documents,
-- geographic_infos. Tabel yang dibentuk ulang: users, audit_logs, kitchens,
-- gallery_images. Data operasional lama tidak dipindahkan - isinya data uji.
--
-- PK internal berpindah dari UUID ke BIGSERIAL sesuai ERD (`PK, INT`).
-- `users.auth0_sub` dipertahankan sehingga tautan ke Auth0 tetap utuh
-- walaupun `users.id` dinomori ulang.
--
-- Bagian akhir berkas ini (CHECK, COMMENT, VIEW) ditulis tangan; sisanya
-- dihasilkan `prisma migrate diff`.
-- =========================================================================


-- CreateEnum
CREATE TYPE "ActiveStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "KitchenType" AS ENUM ('BASAH', 'KERING');

-- CreateEnum
CREATE TYPE "PendistribusianMbg" AS ENUM ('PAGI', 'SIANG');

-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('DITERIMA', 'DITOLAK', 'PROCESSING');

-- CreateEnum
CREATE TYPE "MenuType" AS ENUM ('KERING', 'BASAH');

-- CreateEnum
CREATE TYPE "PortionClass" AS ENUM ('KECIL', 'BESAR', 'BALITA', 'BUSUI_BUMIL');

-- CreateEnum
CREATE TYPE "ComplianceStatus" AS ENUM ('WITHIN', 'BELOW', 'ABOVE');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "DocumentFileType" AS ENUM ('PDF', 'DOCX', 'XLSX');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'CMS_ADMIN';

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_actor_id_fkey";

-- DropForeignKey
ALTER TABLE "documents" DROP CONSTRAINT "documents_uploaded_by_id_fkey";

-- DropForeignKey
ALTER TABLE "gallery_images" DROP CONSTRAINT "gallery_images_uploaded_by_id_fkey";

-- DropForeignKey
ALTER TABLE "kitchens" DROP CONSTRAINT "kitchens_geographic_info_id_fkey";

-- DropForeignKey
ALTER TABLE "menus" DROP CONSTRAINT "menus_kitchen_id_fkey";

-- DropForeignKey
ALTER TABLE "nutritions" DROP CONSTRAINT "nutritions_menu_id_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_kitchen_id_fkey";

-- DropIndex
DROP INDEX "audit_logs_actor_id_created_at_idx";

-- DropIndex
DROP INDEX "audit_logs_entity_type_entity_id_idx";

-- DropIndex
DROP INDEX "gallery_images_uploaded_by_id_idx";

-- DropIndex
DROP INDEX "kitchens_geographic_info_id_idx";

-- AlterTable: audit_logs
-- Blok ini ditulis tangan (bukan hasil generate). Versi generate memasang
-- `entity` sebagai NOT NULL tanpa default, yang gagal kalau tabel sudah berisi
-- baris. Audit trail bersifat append-only dan tidak boleh dibuang, jadi kolom
-- baru diisi dulu dari kolom lama sebelum kolom lama dihapus.
ALTER TABLE "audit_logs"
    ADD COLUMN "entity" TEXT,
    ADD COLUMN "log_id" BIGSERIAL NOT NULL,
    ADD COLUMN "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN "user_id" BIGINT;

UPDATE "audit_logs" SET "entity" = "entity_type", "timestamp" = "created_at";

ALTER TABLE "audit_logs" ALTER COLUMN "entity" SET NOT NULL;

-- TODO(catatan): `actor_id` (UUID) dan `entity_id` (TEXT berisi UUID) tidak bisa
-- dipetakan ke BIGINT, karena PK `users` ikut berganti tipe di migration yang
-- sama sehingga tidak ada lagi UUID untuk di-join. Baris audit lama tetap
-- tersimpan tapi kehilangan tautan pelaku dan tautan entitasnya.
ALTER TABLE "audit_logs"
    DROP CONSTRAINT "audit_logs_pkey",
    DROP COLUMN "actor_id",
    DROP COLUMN "created_at",
    DROP COLUMN "entity_type",
    DROP COLUMN "id",
    DROP COLUMN "entity_id",
    ADD COLUMN "entity_id" BIGINT,
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("log_id");

-- AlterTable
ALTER TABLE "gallery_images" DROP CONSTRAINT "gallery_images_pkey",
DROP COLUMN "id",
DROP COLUMN "uploaded_by_id",
ADD COLUMN     "gallery_id" BIGSERIAL NOT NULL,
ADD COLUMN     "public_id" UUID NOT NULL DEFAULT gen_random_uuid(),
ADD COLUMN     "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "uploaded_by" BIGINT,
ADD CONSTRAINT "gallery_images_pkey" PRIMARY KEY ("gallery_id");

-- AlterTable
ALTER TABLE "kitchens" DROP CONSTRAINT "kitchens_pkey",
DROP COLUMN "address",
DROP COLUMN "capacity",
DROP COLUMN "geographic_info_id",
DROP COLUMN "id",
DROP COLUMN "kitchen_name",
ADD COLUMN     "city_regency" TEXT,
ADD COLUMN     "district" TEXT,
ADD COLUMN     "kitchen_id" BIGSERIAL NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "province" TEXT,
ADD COLUMN     "public_id" UUID NOT NULL DEFAULT gen_random_uuid(),
ADD COLUMN     "type" "KitchenType",
ADD COLUMN     "village" TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "ActiveStatus" NOT NULL DEFAULT 'ACTIVE',
ADD CONSTRAINT "kitchens_pkey" PRIMARY KEY ("kitchen_id");

-- AlterTable
ALTER TABLE "users" DROP CONSTRAINT "users_pkey",
DROP COLUMN "id",
DROP COLUMN "name",
ADD COLUMN     "full_name" TEXT,
ADD COLUMN     "last_login" TIMESTAMP(3),
ADD COLUMN     "status" "ActiveStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "user_id" BIGSERIAL NOT NULL,
DROP COLUMN "scope_id",
ADD COLUMN     "scope_id" BIGINT,
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("user_id");

-- DropTable
DROP TABLE "documents";

-- DropTable
DROP TABLE "geographic_infos";

-- DropTable
DROP TABLE "menus";

-- DropTable
DROP TABLE "nutritions";

-- DropTable
DROP TABLE "transactions";

-- DropEnum
DROP TYPE "FileType";

-- DropEnum
DROP TYPE "KitchenStatus";

-- DropEnum
DROP TYPE "MealType";

-- CreateTable
CREATE TABLE "ingredients" (
    "ingredient_id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bdd_pct" DECIMAL(5,2),
    "energi_per100g" DECIMAL(10,2),
    "protein_per100g" DECIMAL(10,2),
    "lemak_per100g" DECIMAL(10,2),
    "karbohidrat_per100g" DECIMAL(10,2),
    "serat_per100g" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingredients_pkey" PRIMARY KEY ("ingredient_id")
);

-- CreateTable
CREATE TABLE "akg_targets" (
    "akg_id" BIGSERIAL NOT NULL,
    "kelompok_sasaran" TEXT NOT NULL,
    "pendistribusian_mbg" "PendistribusianMbg" NOT NULL,
    "rujukan_pct_akg" TEXT,
    "energi_min" DECIMAL(10,2),
    "energi_max" DECIMAL(10,2),
    "protein_min" DECIMAL(10,2),
    "protein_max" DECIMAL(10,2),
    "lemak_min" DECIMAL(10,2),
    "lemak_max" DECIMAL(10,2),
    "karbohidrat_min" DECIMAL(10,2),
    "karbohidrat_max" DECIMAL(10,2),
    "serat_min" DECIMAL(10,2),
    "serat_max" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "akg_targets_pkey" PRIMARY KEY ("akg_id")
);

-- CreateTable
CREATE TABLE "upload_batches" (
    "batch_id" BIGSERIAL NOT NULL,
    "kitchen_id" BIGINT NOT NULL,
    "uploader_id" BIGINT,
    "upload_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "file_name" TEXT NOT NULL,
    "file_hash" TEXT NOT NULL,
    "row_count" INTEGER NOT NULL,
    "status" "UploadStatus" NOT NULL DEFAULT 'PROCESSING',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upload_batches_pkey" PRIMARY KEY ("batch_id")
);

-- CreateTable
CREATE TABLE "menu_plans" (
    "menu_plan_id" BIGSERIAL NOT NULL,
    "kitchen_id" BIGINT NOT NULL,
    "upload_batch_id" BIGINT NOT NULL,
    "ingredient_id" BIGINT,
    "tanggal" DATE NOT NULL,
    "hari" TEXT,
    "menu_type" "MenuType" NOT NULL,
    "portion_class" "PortionClass" NOT NULL,
    "menu_name" TEXT NOT NULL,
    "bahan" TEXT NOT NULL,
    "berat_bersih" DECIMAL(10,2) NOT NULL,
    "berat_kotor" DECIMAL(10,2) NOT NULL,
    "bdd" DECIMAL(5,2) NOT NULL,
    "jumlah_urt" DECIMAL(10,2),
    "satuan_urt" TEXT,
    "energi" DECIMAL(10,2) NOT NULL,
    "protein" DECIMAL(10,2) NOT NULL,
    "lemak" DECIMAL(10,2) NOT NULL,
    "karbohidrat" DECIMAL(10,2) NOT NULL,
    "serat" DECIMAL(10,2),
    "jumlah_pm" INTEGER NOT NULL,
    "kebutuhan_bahan_kg" DECIMAL(12,3),
    "kebutuhan_kemasan_pax" DECIMAL(12,2),
    "harga_bahan" DECIMAL(14,2),
    "total_harga" DECIMAL(14,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_plans_pkey" PRIMARY KEY ("menu_plan_id")
);

-- CreateTable
CREATE TABLE "recipe_costings" (
    "costing_id" BIGSERIAL NOT NULL,
    "menu_plan_id" BIGINT NOT NULL,
    "item" TEXT NOT NULL,
    "harga_per_kg" DECIMAL(14,2),
    "gramasi" DECIMAL(10,2),
    "yield_test_pct" DECIMAL(5,2),
    "cost_per_porsi" DECIMAL(14,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipe_costings_pkey" PRIMARY KEY ("costing_id")
);

-- CreateTable
CREATE TABLE "akg_compliances" (
    "compliance_id" BIGSERIAL NOT NULL,
    "public_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "menu_plan_id" BIGINT NOT NULL,
    "akg_id" BIGINT NOT NULL,
    "status" "ComplianceStatus" NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "akg_compliances_pkey" PRIMARY KEY ("compliance_id")
);

-- CreateTable
CREATE TABLE "menu_nutritions" (
    "mart_id" BIGSERIAL NOT NULL,
    "public_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "kitchen_id" BIGINT NOT NULL,
    "tanggal" DATE NOT NULL,
    "portion_class" "PortionClass" NOT NULL,
    "total_energi" DECIMAL(10,2),
    "total_protein" DECIMAL(10,2),
    "total_lemak" DECIMAL(10,2),
    "total_karbohidrat" DECIMAL(10,2),
    "total_serat" DECIMAL(10,2),
    "last_refreshed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "menu_nutritions_pkey" PRIMARY KEY ("mart_id")
);

-- CreateTable
CREATE TABLE "daily_kitchens" (
    "mart_id" BIGSERIAL NOT NULL,
    "kitchen_id" BIGINT NOT NULL,
    "tanggal" DATE NOT NULL,
    "meals_prepared" INTEGER NOT NULL,
    "meals_distributed" INTEGER NOT NULL,
    "jumlah_pm" INTEGER NOT NULL,
    "operational_status" "OperationalStatus" NOT NULL DEFAULT 'PENDING',
    "last_refreshed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_kitchens_pkey" PRIMARY KEY ("mart_id")
);

-- CreateTable
CREATE TABLE "menu_costs" (
    "mart_id" BIGSERIAL NOT NULL,
    "kitchen_id" BIGINT NOT NULL,
    "menu_plan_id" BIGINT,
    "tanggal" DATE NOT NULL,
    "cost_per_portion" DECIMAL(14,2),
    "planned_cost" DECIMAL(14,2),
    "actual_cost" DECIMAL(14,2),
    "last_refreshed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "menu_costs_pkey" PRIMARY KEY ("mart_id")
);

-- CreateTable
CREATE TABLE "public_summaries" (
    "summary_id" BIGSERIAL NOT NULL,
    "public_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "meals_served" INTEGER NOT NULL,
    "kitchens_active" INTEGER NOT NULL,
    "coverage_count" INTEGER NOT NULL,
    "last_refreshed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "public_summaries_pkey" PRIMARY KEY ("summary_id")
);

-- CreateTable
CREATE TABLE "cms_announcements" (
    "announcement_id" BIGSERIAL NOT NULL,
    "public_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "publish_date" TIMESTAMP(3),
    "created_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_announcements_pkey" PRIMARY KEY ("announcement_id")
);

-- CreateTable
CREATE TABLE "cms_documents" (
    "document_id" BIGSERIAL NOT NULL,
    "public_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "file_type" "DocumentFileType" NOT NULL,
    "storage_key" TEXT NOT NULL,
    "upload_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "uploaded_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_documents_pkey" PRIMARY KEY ("document_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ingredients_name_key" ON "ingredients"("name");

-- CreateIndex
CREATE UNIQUE INDEX "akg_targets_kelompok_sasaran_pendistribusian_mbg_key" ON "akg_targets"("kelompok_sasaran", "pendistribusian_mbg");

-- CreateIndex
CREATE UNIQUE INDEX "upload_batches_file_hash_key" ON "upload_batches"("file_hash");

-- CreateIndex
CREATE INDEX "upload_batches_kitchen_id_upload_date_idx" ON "upload_batches"("kitchen_id", "upload_date");

-- CreateIndex
CREATE INDEX "menu_plans_kitchen_id_tanggal_idx" ON "menu_plans"("kitchen_id", "tanggal");

-- CreateIndex
CREATE INDEX "menu_plans_upload_batch_id_idx" ON "menu_plans"("upload_batch_id");

-- CreateIndex
CREATE INDEX "menu_plans_ingredient_id_idx" ON "menu_plans"("ingredient_id");

-- CreateIndex
CREATE INDEX "recipe_costings_menu_plan_id_idx" ON "recipe_costings"("menu_plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "akg_compliances_public_id_key" ON "akg_compliances"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "akg_compliances_menu_plan_id_akg_id_key" ON "akg_compliances"("menu_plan_id", "akg_id");

-- CreateIndex
CREATE UNIQUE INDEX "menu_nutritions_public_id_key" ON "menu_nutritions"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "menu_nutritions_kitchen_id_tanggal_portion_class_key" ON "menu_nutritions"("kitchen_id", "tanggal", "portion_class");

-- CreateIndex
CREATE UNIQUE INDEX "daily_kitchens_kitchen_id_tanggal_key" ON "daily_kitchens"("kitchen_id", "tanggal");

-- CreateIndex
CREATE INDEX "menu_costs_kitchen_id_tanggal_idx" ON "menu_costs"("kitchen_id", "tanggal");

-- CreateIndex
CREATE INDEX "menu_costs_menu_plan_id_idx" ON "menu_costs"("menu_plan_id");

-- CreateIndex
CREATE UNIQUE INDEX "public_summaries_public_id_key" ON "public_summaries"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "public_summaries_period_start_period_end_key" ON "public_summaries"("period_start", "period_end");

-- CreateIndex
CREATE UNIQUE INDEX "cms_announcements_public_id_key" ON "cms_announcements"("public_id");

-- CreateIndex
CREATE INDEX "cms_announcements_status_publish_date_idx" ON "cms_announcements"("status", "publish_date");

-- CreateIndex
CREATE INDEX "cms_announcements_created_by_idx" ON "cms_announcements"("created_by");

-- CreateIndex
CREATE UNIQUE INDEX "cms_documents_public_id_key" ON "cms_documents"("public_id");

-- CreateIndex
CREATE INDEX "cms_documents_status_idx" ON "cms_documents"("status");

-- CreateIndex
CREATE INDEX "cms_documents_category_idx" ON "cms_documents"("category");

-- CreateIndex
CREATE INDEX "cms_documents_uploaded_by_idx" ON "cms_documents"("uploaded_by");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_timestamp_idx" ON "audit_logs"("user_id", "timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entity_id_idx" ON "audit_logs"("entity", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "gallery_images_public_id_key" ON "gallery_images"("public_id");

-- CreateIndex
CREATE INDEX "gallery_images_uploaded_by_idx" ON "gallery_images"("uploaded_by");

-- CreateIndex
CREATE UNIQUE INDEX "kitchens_public_id_key" ON "kitchens"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "kitchens_name_key" ON "kitchens"("name");

-- CreateIndex
CREATE INDEX "kitchens_status_idx" ON "kitchens"("status");

-- CreateIndex
CREATE INDEX "users_scope_id_idx" ON "users"("scope_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_scope_id_fkey" FOREIGN KEY ("scope_id") REFERENCES "kitchens"("kitchen_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upload_batches" ADD CONSTRAINT "upload_batches_kitchen_id_fkey" FOREIGN KEY ("kitchen_id") REFERENCES "kitchens"("kitchen_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upload_batches" ADD CONSTRAINT "upload_batches_uploader_id_fkey" FOREIGN KEY ("uploader_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_plans" ADD CONSTRAINT "menu_plans_kitchen_id_fkey" FOREIGN KEY ("kitchen_id") REFERENCES "kitchens"("kitchen_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_plans" ADD CONSTRAINT "menu_plans_upload_batch_id_fkey" FOREIGN KEY ("upload_batch_id") REFERENCES "upload_batches"("batch_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_plans" ADD CONSTRAINT "menu_plans_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("ingredient_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_costings" ADD CONSTRAINT "recipe_costings_menu_plan_id_fkey" FOREIGN KEY ("menu_plan_id") REFERENCES "menu_plans"("menu_plan_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "akg_compliances" ADD CONSTRAINT "akg_compliances_menu_plan_id_fkey" FOREIGN KEY ("menu_plan_id") REFERENCES "menu_plans"("menu_plan_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "akg_compliances" ADD CONSTRAINT "akg_compliances_akg_id_fkey" FOREIGN KEY ("akg_id") REFERENCES "akg_targets"("akg_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_nutritions" ADD CONSTRAINT "menu_nutritions_kitchen_id_fkey" FOREIGN KEY ("kitchen_id") REFERENCES "kitchens"("kitchen_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_kitchens" ADD CONSTRAINT "daily_kitchens_kitchen_id_fkey" FOREIGN KEY ("kitchen_id") REFERENCES "kitchens"("kitchen_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_costs" ADD CONSTRAINT "menu_costs_kitchen_id_fkey" FOREIGN KEY ("kitchen_id") REFERENCES "kitchens"("kitchen_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_costs" ADD CONSTRAINT "menu_costs_menu_plan_id_fkey" FOREIGN KEY ("menu_plan_id") REFERENCES "menu_plans"("menu_plan_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_announcements" ADD CONSTRAINT "cms_announcements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cms_documents" ADD CONSTRAINT "cms_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_images" ADD CONSTRAINT "gallery_images_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;




-- =========================================================================
-- CHECK constraints (ditulis tangan - Prisma tidak menghasilkan CHECK)
--
-- Catatan null-safety: di PostgreSQL, CHECK menolak baris hanya kalau
-- ekspresinya bernilai FALSE. Perbandingan yang melibatkan NULL bernilai NULL,
-- bukan FALSE, sehingga semua constraint di bawah otomatis lolos untuk kolom
-- yang belum diisi. Tidak perlu penjagaan `IS NULL OR ...` tambahan.
-- =========================================================================

-- akg_targets: batas bawah tidak boleh melampaui batas atas.
ALTER TABLE "akg_targets"
    ADD CONSTRAINT "akg_targets_energi_range_check"      CHECK ("energi_min" <= "energi_max"),
    ADD CONSTRAINT "akg_targets_protein_range_check"     CHECK ("protein_min" <= "protein_max"),
    ADD CONSTRAINT "akg_targets_lemak_range_check"       CHECK ("lemak_min" <= "lemak_max"),
    ADD CONSTRAINT "akg_targets_karbohidrat_range_check" CHECK ("karbohidrat_min" <= "karbohidrat_max"),
    ADD CONSTRAINT "akg_targets_serat_range_check"       CHECK ("serat_min" <= "serat_max"),
    ADD CONSTRAINT "akg_targets_nonnegative_check"       CHECK (
        "energi_min" >= 0 AND "protein_min" >= 0 AND "lemak_min" >= 0
        AND "karbohidrat_min" >= 0 AND "serat_min" >= 0
    );

-- ingredients: BDD adalah persentase.
ALTER TABLE "ingredients"
    ADD CONSTRAINT "ingredients_bdd_pct_range_check" CHECK ("bdd_pct" BETWEEN 0 AND 100);

-- upload_batches: jumlah baris tidak mungkin negatif.
ALTER TABLE "upload_batches"
    ADD CONSTRAINT "upload_batches_row_count_check" CHECK ("row_count" >= 0);

-- menu_plans: berat, porsi, dan harga tidak boleh negatif; BDD persentase.
ALTER TABLE "menu_plans"
    ADD CONSTRAINT "menu_plans_bdd_range_check"      CHECK ("bdd" BETWEEN 0 AND 100),
    ADD CONSTRAINT "menu_plans_berat_check"          CHECK ("berat_bersih" >= 0 AND "berat_kotor" >= 0),
    ADD CONSTRAINT "menu_plans_gizi_check"           CHECK (
        "energi" >= 0 AND "protein" >= 0 AND "lemak" >= 0
        AND "karbohidrat" >= 0 AND "serat" >= 0
    ),
    ADD CONSTRAINT "menu_plans_jumlah_pm_check"      CHECK ("jumlah_pm" >= 0),
    ADD CONSTRAINT "menu_plans_kebutuhan_check"      CHECK ("kebutuhan_bahan_kg" >= 0 AND "kebutuhan_kemasan_pax" >= 0),
    ADD CONSTRAINT "menu_plans_harga_check"          CHECK ("harga_bahan" >= 0 AND "total_harga" >= 0);

-- recipe_costings: yield test dipakai sebagai pembagi, jadi tidak boleh nol.
ALTER TABLE "recipe_costings"
    ADD CONSTRAINT "recipe_costings_yield_range_check" CHECK ("yield_test_pct" > 0 AND "yield_test_pct" <= 100),
    ADD CONSTRAINT "recipe_costings_nonnegative_check" CHECK (
        "harga_per_kg" >= 0 AND "gramasi" >= 0 AND "cost_per_porsi" >= 0
    );

-- daily_kitchens: porsi yang disalurkan tidak boleh melebihi yang disiapkan.
ALTER TABLE "daily_kitchens"
    ADD CONSTRAINT "daily_kitchens_meals_check"       CHECK ("meals_prepared" >= 0 AND "meals_distributed" >= 0),
    ADD CONSTRAINT "daily_kitchens_distributed_check" CHECK ("meals_distributed" <= "meals_prepared"),
    ADD CONSTRAINT "daily_kitchens_jumlah_pm_check"   CHECK ("jumlah_pm" >= 0);

-- menu_costs: biaya tidak boleh negatif.
ALTER TABLE "menu_costs"
    ADD CONSTRAINT "menu_costs_nonnegative_check" CHECK (
        "cost_per_portion" >= 0 AND "planned_cost" >= 0 AND "actual_cost" >= 0
    );

-- public_summaries: periode harus maju, hitungan tidak boleh negatif.
ALTER TABLE "public_summaries"
    ADD CONSTRAINT "public_summaries_period_check" CHECK ("period_start" <= "period_end"),
    ADD CONSTRAINT "public_summaries_counts_check" CHECK (
        "meals_served" >= 0 AND "kitchens_active" >= 0 AND "coverage_count" >= 0
    );

-- =========================================================================
-- COMMENT: menandai kolom/tabel sensitif (SCRUM-13)
-- =========================================================================

COMMENT ON TABLE "menu_costs" IS
    'INTERNAL-ONLY. ERD menandai tabel ini [mart, internal-only]: seluruh kolomnya biaya. Tidak boleh direferensikan view publik manapun.';

COMMENT ON COLUMN "menu_plans"."harga_bahan" IS
    'INTERNAL-ONLY (SCRUM-13): harga satuan bahan, rupiah.';
COMMENT ON COLUMN "menu_plans"."total_harga" IS
    'INTERNAL-ONLY (SCRUM-13): total biaya baris, rupiah.';
COMMENT ON COLUMN "menu_plans"."bahan" IS
    'Nama bahan apa adanya dari form SOP-OPR-001, teks bebas per ahli gizi. TODO(catatan): aturan matching ke ingredients.ingredient_id belum ada.';

COMMENT ON COLUMN "daily_kitchens"."jumlah_pm" IS
    'INTERNAL-ONLY (SCRUM-13): hitungan penerima manfaat yang eksak.';

COMMENT ON COLUMN "akg_targets"."serat_min" IS
    'TODO(catatan): Tabel 2 SOP-OPR-001 (Juknis 401.1/2025) tidak memuat rentang Serat. Nilai perlu dikonfirmasi Program Team sebelum dipakai validasi compliance.';
COMMENT ON COLUMN "akg_targets"."serat_max" IS
    'TODO(catatan): lihat catatan pada serat_min.';

COMMENT ON COLUMN "upload_batches"."file_hash" IS
    'UNIQUE - dasar deteksi duplicate import (SCRUM-6).';

-- =========================================================================
-- VIEW publik (SCRUM-13)
--
-- Pemisahan data publik vs internal diwujudkan sebagai view, BUKAN tabel
-- permission baru. Kedua view di bawah hanya memilih kolom non-sensitif:
-- tidak ada biaya, tidak ada supplier, tidak ada hitungan penerima manfaat
-- yang eksak, tidak ada PII.
--
-- TODO(catatan): view ini baru membatasi KOLOM APA yang tersedia. Penegakan
-- akses yang sebenarnya - GRANT SELECT per role database, pencabutan akses
-- langsung ke tabel dasar, dan kemungkinan row-level security - adalah
-- pekerjaan layer berikutnya dan sengaja tidak diputuskan di migration ini.
-- =========================================================================

CREATE VIEW "public_menu_nutrition_view" AS
SELECT
    mn."public_id"          AS "menu_nutrition_public_id",
    k."public_id"           AS "kitchen_public_id",
    k."name"                AS "kitchen_name",
    k."province",
    k."city_regency",
    mn."tanggal",
    mn."portion_class",
    mn."total_energi",
    mn."total_protein",
    mn."total_lemak",
    mn."total_karbohidrat",
    mn."total_serat",
    mn."last_refreshed_at"
FROM "menu_nutritions" mn
JOIN "kitchens" k ON k."kitchen_id" = mn."kitchen_id"
WHERE k."status" = 'ACTIVE';

COMMENT ON VIEW "public_menu_nutrition_view" IS
    'Permukaan publik untuk gizi per dapur/tanggal/kelompok porsi. Hanya kolom non-sensitif. ID internal tidak diekspos - yang keluar hanya public_id. TODO(catatan): GRANT/role belum diatur, menyusul di layer berikutnya.';

CREATE VIEW "public_kitchen_coverage_view" AS
SELECT
    k."public_id"           AS "kitchen_public_id",
    k."name"                AS "kitchen_name",
    k."province",
    k."city_regency",
    k."district",
    k."village",
    k."latitude",
    k."longitude",
    s."period_start",
    s."period_end",
    s."meals_served",
    s."kitchens_active",
    s."coverage_count",
    s."last_refreshed_at"
FROM "kitchens" k
LEFT JOIN LATERAL (
    SELECT "period_start", "period_end", "meals_served", "kitchens_active",
           "coverage_count", "last_refreshed_at"
    FROM "public_summaries"
    ORDER BY "period_end" DESC
    LIMIT 1
) s ON TRUE
WHERE k."status" = 'ACTIVE';

COMMENT ON VIEW "public_kitchen_coverage_view" IS
    'Permukaan publik untuk peta sebaran dapur plus angka ringkas periode terakhir. Tanpa biaya dan tanpa jumlah_pm eksak. TODO(catatan): GRANT/role belum diatur, menyusul di layer berikutnya.';
