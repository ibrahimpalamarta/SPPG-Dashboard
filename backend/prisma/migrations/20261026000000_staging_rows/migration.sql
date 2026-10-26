-- SCRUM-24: staging persisten (Pilihan A, satu tabel generik) + status SUPERSEDED (SCRUM-124).
ALTER TYPE "UploadStatus" ADD VALUE 'SUPERSEDED';

CREATE TABLE "staging_rows" (
    "id" BIGSERIAL NOT NULL,
    "upload_batch_id" UUID NOT NULL,
    "source_record_id" TEXT NOT NULL,
    "kitchen_id" TEXT NOT NULL,
    "source_system" "SourceSystem" NOT NULL,
    "source_file_name" TEXT NOT NULL,
    "template_version" TEXT,
    "mapping_profile_id" TEXT,
    "loaded_at" TIMESTAMP(3) NOT NULL,
    "domain" "UploadDomain" NOT NULL,
    "sheet_name" TEXT NOT NULL,
    "source_row_number" INTEGER NOT NULL,
    "cells" JSONB NOT NULL,

    CONSTRAINT "staging_rows_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "staging_rows_source_record_id_key" ON "staging_rows"("source_record_id");
CREATE INDEX "staging_rows_upload_batch_id_idx" ON "staging_rows"("upload_batch_id");

ALTER TABLE "staging_rows" ADD CONSTRAINT "staging_rows_upload_batch_id_fkey" FOREIGN KEY ("upload_batch_id") REFERENCES "upload_batches"("public_id") ON DELETE CASCADE ON UPDATE CASCADE;
