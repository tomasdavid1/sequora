-- CreateEnum
CREATE TYPE "ThreadPromptType" AS ENUM ('TREATMENT', 'TRAINING');

-- CreateTable
CREATE TABLE "ThreadPrompt" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "type" "ThreadPromptType" NOT NULL DEFAULT 'TREATMENT',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThreadPrompt_pkey" PRIMARY KEY ("id")
);
