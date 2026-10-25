-- SCRUM-20: satu akun bisa memegang lebih dari satu dapur. `users.scope_id`
-- diganti tabel `user_kitchen_scopes`; isinya dipindah dulu sebelum kolom
-- lama dibuang supaya tidak ada DATA_ADMIN yang kehilangan dapurnya.

-- AlterTable
ALTER TABLE "kitchens" ADD COLUMN     "code" TEXT;

-- CreateTable
CREATE TABLE "user_kitchen_scopes" (
    "user_id" BIGINT NOT NULL,
    "kitchen_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_kitchen_scopes_pkey" PRIMARY KEY ("user_id","kitchen_id")
);

-- CreateIndex
CREATE INDEX "user_kitchen_scopes_kitchen_id_idx" ON "user_kitchen_scopes"("kitchen_id");

-- CreateIndex
CREATE UNIQUE INDEX "kitchens_code_key" ON "kitchens"("code");

-- AddForeignKey
ALTER TABLE "user_kitchen_scopes" ADD CONSTRAINT "user_kitchen_scopes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_kitchen_scopes" ADD CONSTRAINT "user_kitchen_scopes_kitchen_id_fkey" FOREIGN KEY ("kitchen_id") REFERENCES "kitchens"("kitchen_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill
INSERT INTO "user_kitchen_scopes" ("user_id", "kitchen_id")
SELECT "user_id", "scope_id" FROM "users" WHERE "scope_id" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_scope_id_fkey";

-- DropIndex
DROP INDEX "users_scope_id_idx";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "scope_id";
