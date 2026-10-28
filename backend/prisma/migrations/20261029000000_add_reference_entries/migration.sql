-- CreateEnum
CREATE TYPE "ReferenceEntryKind" AS ENUM ('KAMUS', 'ATURAN', 'KODE');

-- CreateTable
CREATE TABLE "reference_entries" (
    "reference_entry_id" BIGSERIAL NOT NULL,
    "kind" "ReferenceEntryKind" NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "fields" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reference_entries_pkey" PRIMARY KEY ("reference_entry_id")
);

-- CreateIndex
CREATE INDEX "reference_entries_kind_sort_order_idx" ON "reference_entries"("kind", "sort_order");

