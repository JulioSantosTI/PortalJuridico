-- CreateTable
CREATE TABLE "InternalTicketInteraction" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorUserId" TEXT,
    "authorAdminId" TEXT,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InternalTicketInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternalTicketAttachment" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "interactionId" TEXT,
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InternalTicketAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InternalTicketInteraction_ticketId_idx" ON "InternalTicketInteraction"("ticketId");

-- AddForeignKey
ALTER TABLE "InternalTicketInteraction" ADD CONSTRAINT "InternalTicketInteraction_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "InternalTicket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalTicketInteraction" ADD CONSTRAINT "InternalTicketInteraction_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalTicketInteraction" ADD CONSTRAINT "InternalTicketInteraction_authorAdminId_fkey" FOREIGN KEY ("authorAdminId") REFERENCES "PlatformAdmin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalTicketAttachment" ADD CONSTRAINT "InternalTicketAttachment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "InternalTicket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalTicketAttachment" ADD CONSTRAINT "InternalTicketAttachment_interactionId_fkey" FOREIGN KEY ("interactionId") REFERENCES "InternalTicketInteraction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
