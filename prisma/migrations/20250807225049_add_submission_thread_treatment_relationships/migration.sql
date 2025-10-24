/*
  Warnings:

  - A unique constraint covering the columns `[threadId]` on the table `Treatment` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Thread" ADD COLUMN     "submissionId" TEXT;

-- AlterTable
ALTER TABLE "Treatment" ADD COLUMN     "submissionId" TEXT,
ADD COLUMN     "threadId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Treatment_threadId_key" ON "Treatment"("threadId");

-- AddForeignKey
ALTER TABLE "Treatment" ADD CONSTRAINT "Treatment_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Treatment" ADD CONSTRAINT "Treatment_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Thread" ADD CONSTRAINT "Thread_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE SET NULL ON UPDATE CASCADE;
