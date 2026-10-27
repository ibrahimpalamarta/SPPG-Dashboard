-- DropIndex
DROP INDEX "staging_rows_source_record_id_key";

-- CreateIndex
CREATE INDEX "staging_rows_source_record_id_idx" ON "staging_rows"("source_record_id");

