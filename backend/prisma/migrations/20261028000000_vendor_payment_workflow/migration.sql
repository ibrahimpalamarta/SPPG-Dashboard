-- CreateTable
CREATE TABLE "vendor_payment_workflows" (
    "id" BIGSERIAL NOT NULL,
    "upload_batch_id" UUID NOT NULL,
    "payment_request_id" TEXT NOT NULL,
    "mapping_profile_id" TEXT NOT NULL,
    "kitchen_id" BIGINT NOT NULL,
    "source_record_id" TEXT NOT NULL,
    "source_system" "SourceSystem" NOT NULL,
    "source_file_name" TEXT NOT NULL,
    "template_version" TEXT,
    "loaded_at" TIMESTAMP(3) NOT NULL,
    "request_date" DATE,
    "description" TEXT,
    "category" TEXT,
    "supplier_name" TEXT,
    "request_amount" DECIMAL(16,2),
    "checklist" BOOLEAN,
    "supplier_invoice_link" TEXT,
    "payment_invoice_link" TEXT,
    "maker_input_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "paid_amount" DECIMAL(16,2),
    "payment_reference" TEXT,

    CONSTRAINT "vendor_payment_workflows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vendor_payment_workflows_kitchen_id_request_date_idx" ON "vendor_payment_workflows"("kitchen_id", "request_date");

-- CreateIndex
CREATE INDEX "vendor_payment_workflows_source_record_id_idx" ON "vendor_payment_workflows"("source_record_id");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_payment_workflows_upload_batch_id_payment_request_id_key" ON "vendor_payment_workflows"("upload_batch_id", "payment_request_id");

-- AddForeignKey
ALTER TABLE "vendor_payment_workflows" ADD CONSTRAINT "vendor_payment_workflows_upload_batch_id_fkey" FOREIGN KEY ("upload_batch_id") REFERENCES "upload_batches"("public_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_payment_workflows" ADD CONSTRAINT "vendor_payment_workflows_kitchen_id_fkey" FOREIGN KEY ("kitchen_id") REFERENCES "kitchens"("kitchen_id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- SCRUM-47: a paid request must carry its payment reference.
ALTER TABLE "vendor_payment_workflows"
  ADD CONSTRAINT "vendor_payment_workflows_paid_has_reference"
  CHECK ("paid_at" IS NULL OR "payment_reference" IS NOT NULL);
