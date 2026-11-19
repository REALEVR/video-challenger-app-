-- CreateTable
CREATE TABLE "SubmissionReport" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubmissionReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubmissionReport_submissionId_idx" ON "SubmissionReport"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "SubmissionReport_submissionId_reporterId_key" ON "SubmissionReport"("submissionId", "reporterId");

-- AddForeignKey
ALTER TABLE "SubmissionReport" ADD CONSTRAINT "SubmissionReport_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionReport" ADD CONSTRAINT "SubmissionReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
