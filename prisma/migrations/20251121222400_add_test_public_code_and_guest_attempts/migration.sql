-- AlterTable
ALTER TABLE "Test"
ADD COLUMN     "publicCode" TEXT,
ADD COLUMN     "publishedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "GuestTestAttempt" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "answers" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestTestAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Test_publicCode_key" ON "Test"("publicCode");

-- AddForeignKey
ALTER TABLE "GuestTestAttempt" ADD CONSTRAINT "GuestTestAttempt_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
