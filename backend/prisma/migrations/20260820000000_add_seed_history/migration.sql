-- CreateTable
CREATE TABLE "seed_history" (
    "seed_id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "ran_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seed_history_pkey" PRIMARY KEY ("seed_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "seed_history_name_key" ON "seed_history"("name");
