-- CreateEnum
CREATE TYPE "ReplySource" AS ENUM ('AGENT', 'CUSTOMER');

-- CreateTable
CREATE TABLE "TicketReply" (
    "id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "source" "ReplySource" NOT NULL DEFAULT 'AGENT',
    "authorId" TEXT,
    "senderEmail" TEXT,
    "senderName" TEXT,
    "ticketId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketReply_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TicketReply" ADD CONSTRAINT "TicketReply_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketReply" ADD CONSTRAINT "TicketReply_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
