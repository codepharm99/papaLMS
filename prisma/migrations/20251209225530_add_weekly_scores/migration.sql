-- CreateTable
CREATE TABLE "WeeklyScore" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "part" INTEGER NOT NULL,
    "lectureScore" INTEGER NOT NULL,
    "practiceScore" INTEGER NOT NULL,
    "individualWorkScore" INTEGER NOT NULL,
    "ratingScore" INTEGER,
    "midtermScore" INTEGER,
    "examScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeeklyScore_studentId_courseId_idx" ON "WeeklyScore"("studentId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyScore_courseId_studentId_week_key" ON "WeeklyScore"("courseId", "studentId", "week");

-- AddForeignKey
ALTER TABLE "WeeklyScore" ADD CONSTRAINT "WeeklyScore_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyScore" ADD CONSTRAINT "WeeklyScore_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
