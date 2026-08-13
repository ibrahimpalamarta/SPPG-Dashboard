-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK');

-- CreateEnum
CREATE TYPE "OperationalStatus" AS ENUM ('COMPLETED', 'PENDING', 'CANCELLED');

-- CreateEnum
CREATE TYPE "KitchenStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "FileType" AS ENUM ('PDF', 'DOCX', 'XLSX', 'PPTX', 'CSV', 'OTHER');

-- CreateTable
CREATE TABLE "geographic_infos" (
    "id" UUID NOT NULL,
    "province" TEXT NOT NULL,
    "city_regency" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "village" TEXT NOT NULL,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "geographic_infos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kitchens" (
    "id" UUID NOT NULL,
    "kitchen_name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "status" "KitchenStatus" NOT NULL DEFAULT 'ACTIVE',
    "capacity" INTEGER NOT NULL,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "geographic_info_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kitchens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menus" (
    "id" UUID NOT NULL,
    "menu_date" DATE NOT NULL,
    "meal_type" "MealType" NOT NULL,
    "food_items" TEXT[],
    "portion_size" INTEGER NOT NULL,
    "kitchen_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "transaction_date" DATE NOT NULL,
    "kitchen_id" UUID NOT NULL,
    "number_of_meals" INTEGER NOT NULL,
    "operational_status" "OperationalStatus" NOT NULL DEFAULT 'PENDING',
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nutritions" (
    "id" UUID NOT NULL,
    "menu_id" UUID NOT NULL,
    "calories" DECIMAL(8,2) NOT NULL,
    "protein" DECIMAL(7,2) NOT NULL,
    "carbohydrates" DECIMAL(7,2) NOT NULL,
    "fat" DECIMAL(7,2) NOT NULL,
    "micronutrients" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nutritions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery_images" (
    "id" UUID NOT NULL,
    "image_title" TEXT NOT NULL,
    "description" TEXT,
    "storage_key" TEXT NOT NULL,
    "upload_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploaded_by_id" UUID,
    "category" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gallery_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "document_title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "upload_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploaded_by_id" UUID,
    "file_type" "FileType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "geographic_infos_province_city_regency_district_village_key" ON "geographic_infos"("province", "city_regency", "district", "village");

-- CreateIndex
CREATE INDEX "kitchens_geographic_info_id_idx" ON "kitchens"("geographic_info_id");

-- CreateIndex
CREATE INDEX "kitchens_status_idx" ON "kitchens"("status");

-- CreateIndex
CREATE INDEX "menus_kitchen_id_menu_date_idx" ON "menus"("kitchen_id", "menu_date");

-- CreateIndex
CREATE INDEX "transactions_kitchen_id_transaction_date_idx" ON "transactions"("kitchen_id", "transaction_date");

-- CreateIndex
CREATE INDEX "transactions_operational_status_idx" ON "transactions"("operational_status");

-- CreateIndex
CREATE UNIQUE INDEX "nutritions_menu_id_key" ON "nutritions"("menu_id");

-- CreateIndex
CREATE INDEX "gallery_images_uploaded_by_id_idx" ON "gallery_images"("uploaded_by_id");

-- CreateIndex
CREATE INDEX "gallery_images_category_idx" ON "gallery_images"("category");

-- CreateIndex
CREATE INDEX "documents_uploaded_by_id_idx" ON "documents"("uploaded_by_id");

-- CreateIndex
CREATE INDEX "documents_category_idx" ON "documents"("category");

-- AddForeignKey
ALTER TABLE "kitchens" ADD CONSTRAINT "kitchens_geographic_info_id_fkey" FOREIGN KEY ("geographic_info_id") REFERENCES "geographic_infos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menus" ADD CONSTRAINT "menus_kitchen_id_fkey" FOREIGN KEY ("kitchen_id") REFERENCES "kitchens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_kitchen_id_fkey" FOREIGN KEY ("kitchen_id") REFERENCES "kitchens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutritions" ADD CONSTRAINT "nutritions_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "menus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_images" ADD CONSTRAINT "gallery_images_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

