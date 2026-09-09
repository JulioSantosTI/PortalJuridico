-- AlterTable
ALTER TABLE "User" ADD COLUMN     "hasLicense" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: quem já está ativo hoje é quem hoje conta como "licença usada"
-- no modelo antigo — preserva o acesso de quem já usa o sistema.
UPDATE "User" SET "hasLicense" = "active";

-- CreateIndex
CREATE INDEX "User_role_hasLicense_idx" ON "User"("role", "hasLicense");
