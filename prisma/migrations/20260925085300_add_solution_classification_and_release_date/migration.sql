-- AlterTable
ALTER TABLE "Tender" ADD COLUMN     "bidStartAt" TIMESTAMP(3),
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "releaseDateSource" TEXT;

-- CreateTable
CREATE TABLE "SolutionCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SolutionCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolutionKeyword" (
    "id" TEXT NOT NULL,
    "solutionId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "matchType" TEXT NOT NULL DEFAULT 'CONTAINS',
    "isNegative" BOOLEAN NOT NULL DEFAULT false,
    "synonyms" TEXT,
    "minConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SolutionKeyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenderSolution" (
    "id" TEXT NOT NULL,
    "tenderId" TEXT NOT NULL,
    "solutionId" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "matchedKeywords" TEXT[],
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "detectedBy" TEXT NOT NULL DEFAULT 'AUTO',

    CONSTRAINT "TenderSolution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SolutionCategory_slug_key" ON "SolutionCategory"("slug");

-- CreateIndex
CREATE INDEX "SolutionCategory_isActive_idx" ON "SolutionCategory"("isActive");

-- CreateIndex
CREATE INDEX "SolutionCategory_parentId_idx" ON "SolutionCategory"("parentId");

-- CreateIndex
CREATE INDEX "SolutionKeyword_solutionId_idx" ON "SolutionKeyword"("solutionId");

-- CreateIndex
CREATE UNIQUE INDEX "SolutionKeyword_solutionId_keyword_key" ON "SolutionKeyword"("solutionId", "keyword");

-- CreateIndex
CREATE INDEX "TenderSolution_tenderId_idx" ON "TenderSolution"("tenderId");

-- CreateIndex
CREATE INDEX "TenderSolution_solutionId_idx" ON "TenderSolution"("solutionId");

-- CreateIndex
CREATE UNIQUE INDEX "TenderSolution_tenderId_solutionId_key" ON "TenderSolution"("tenderId", "solutionId");

-- AddForeignKey
ALTER TABLE "SolutionCategory" ADD CONSTRAINT "SolutionCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "SolutionCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolutionKeyword" ADD CONSTRAINT "SolutionKeyword_solutionId_fkey" FOREIGN KEY ("solutionId") REFERENCES "SolutionCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenderSolution" ADD CONSTRAINT "TenderSolution_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenderSolution" ADD CONSTRAINT "TenderSolution_solutionId_fkey" FOREIGN KEY ("solutionId") REFERENCES "SolutionCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
