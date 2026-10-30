-- SCRUM-31/73: hasil mapping Menu disimpan saat upload (B-MAPOUT). SCRUM-29/45: tabel PO tanpa writer (B-SRC-SKN).
-- Internal-only: tidak ada GRANT ke sppg_public.
-- CreateTable
CREATE TABLE "menu_recipe_lines" (
    "id" BIGSERIAL NOT NULL,
    "upload_batch_id" UUID NOT NULL,
    "mapping_profile_id" TEXT NOT NULL,
    "kitchen_id" BIGINT NOT NULL,
    "source_record_id" TEXT NOT NULL,
    "source_system" "SourceSystem" NOT NULL,
    "source_file_name" TEXT NOT NULL,
    "template_version" TEXT,
    "loaded_at" TIMESTAMP(3) NOT NULL,
    "period" TEXT,
    "serving_date" DATE,
    "menu_type" TEXT,
    "portion_segment" TEXT,
    "menu_name" TEXT,
    "ingredient" TEXT,
    "urt_unit" TEXT,
    "urt_qty" DECIMAL(14,3),
    "gross_weight_g" DECIMAL(14,3),
    "net_weight_g" DECIMAL(14,3),
    "edible_portion_pct" DECIMAL(7,3),
    "energy_kcal" DECIMAL(14,3),
    "protein_g" DECIMAL(14,3),
    "fat_g" DECIMAL(14,3),
    "carbohydrate_g" DECIMAL(14,3),
    "fiber_g" DECIMAL(14,3),
    "planned_portions" DECIMAL(14,2),
    "ingredient_need_kg" DECIMAL(14,3),
    "packaged_need_pax" DECIMAL(14,2),
    "unit_price" DECIMAL(14,2),
    "line_total" DECIMAL(16,2),

    CONSTRAINT "menu_recipe_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_lines" (
    "id" BIGSERIAL NOT NULL,
    "upload_batch_id" UUID NOT NULL,
    "mapping_profile_id" TEXT NOT NULL,
    "kitchen_id" BIGINT NOT NULL,
    "source_record_id" TEXT NOT NULL,
    "source_system" "SourceSystem" NOT NULL,
    "source_file_name" TEXT NOT NULL,
    "template_version" TEXT,
    "loaded_at" TIMESTAMP(3) NOT NULL,
    "po_id" TEXT NOT NULL,
    "po_line_id" TEXT NOT NULL,
    "po_date" DATE,
    "supplier_name" TEXT,
    "item_name" TEXT,
    "qty" DECIMAL(14,3),
    "unit" TEXT,
    "unit_price" DECIMAL(14,2),
    "line_amount" DECIMAL(16,2),
    "rab_ingredient_budget_id" BIGINT,

    CONSTRAINT "purchase_order_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "menu_recipe_lines_kitchen_id_serving_date_idx" ON "menu_recipe_lines"("kitchen_id", "serving_date");

-- CreateIndex
CREATE INDEX "menu_recipe_lines_upload_batch_id_idx" ON "menu_recipe_lines"("upload_batch_id");

-- CreateIndex
CREATE INDEX "menu_recipe_lines_source_record_id_idx" ON "menu_recipe_lines"("source_record_id");

-- CreateIndex
CREATE INDEX "purchase_order_lines_kitchen_id_po_date_idx" ON "purchase_order_lines"("kitchen_id", "po_date");

-- CreateIndex
CREATE INDEX "purchase_order_lines_source_record_id_idx" ON "purchase_order_lines"("source_record_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_order_lines_upload_batch_id_po_id_po_line_id_key" ON "purchase_order_lines"("upload_batch_id", "po_id", "po_line_id");

-- AddForeignKey
ALTER TABLE "menu_recipe_lines" ADD CONSTRAINT "menu_recipe_lines_upload_batch_id_fkey" FOREIGN KEY ("upload_batch_id") REFERENCES "upload_batches"("public_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_recipe_lines" ADD CONSTRAINT "menu_recipe_lines_kitchen_id_fkey" FOREIGN KEY ("kitchen_id") REFERENCES "kitchens"("kitchen_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_upload_batch_id_fkey" FOREIGN KEY ("upload_batch_id") REFERENCES "upload_batches"("public_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_kitchen_id_fkey" FOREIGN KEY ("kitchen_id") REFERENCES "kitchens"("kitchen_id") ON DELETE RESTRICT ON UPDATE CASCADE;

