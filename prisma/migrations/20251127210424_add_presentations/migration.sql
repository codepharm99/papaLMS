-- CreateTable
CREATE TABLE "Presentation" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slides" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Presentation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Presentation_teacherId_createdAt_idx" ON "Presentation"("teacherId", "createdAt");

-- AddForeignKey
ALTER TABLE "Presentation" ADD CONSTRAINT "Presentation_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
