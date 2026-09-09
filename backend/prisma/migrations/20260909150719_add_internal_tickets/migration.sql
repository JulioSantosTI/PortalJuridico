-- CreateEnum
CREATE TYPE "InternalTicketStatus" AS ENUM ('ABERTO', 'RESOLVIDO');

-- CreateTable
CREATE TABLE "InternalTicket" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "status" "InternalTicketStatus" NOT NULL DEFAULT 'ABERTO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "InternalTicket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InternalTicket_status_idx" ON "InternalTicket"("status");

-- AddForeignKey
ALTER TABLE "InternalTicket" ADD CONSTRAINT "InternalTicket_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
