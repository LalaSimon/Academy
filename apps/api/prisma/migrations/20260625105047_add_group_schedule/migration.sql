-- AlterTable
ALTER TABLE "Class" ADD COLUMN     "pricePerClass" DECIMAL(10,2),
ADD COLUMN     "scheduleId" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "groupId" TEXT;

-- CreateTable
CREATE TABLE "GroupSchedule" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "durationMin" INTEGER NOT NULL DEFAULT 60,
    "pricePerClass" DECIMAL(10,2) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GroupSchedule_groupId_effectiveFrom_idx" ON "GroupSchedule"("groupId", "effectiveFrom");

-- AddForeignKey
ALTER TABLE "GroupSchedule" ADD CONSTRAINT "GroupSchedule_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "GroupSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
