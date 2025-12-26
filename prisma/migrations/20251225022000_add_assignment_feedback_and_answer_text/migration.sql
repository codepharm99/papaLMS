-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "answerText" TEXT;

-- AlterTable
ALTER TABLE "TestAssignment" ADD COLUMN     "answers" JSONB;
ALTER TABLE "TestAssignment" ADD COLUMN     "feedback" JSONB;
ALTER TABLE "TestAssignment" ADD COLUMN     "reviewedAt" TIMESTAMP(3);
