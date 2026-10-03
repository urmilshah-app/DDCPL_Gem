-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "NotifyChannel" AS ENUM ('EMAIL', 'BROWSER', 'TELEGRAM', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "NotifyStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED', 'DISABLED');

-- CreateEnum
CREATE TYPE "TenderStatus" AS ENUM ('NEW', 'VIEWED', 'SHORTLISTED', 'IGNORED', 'EXPIRED', 'UPDATED', 'CLOSED');

-- CreateEnum
CREATE TYPE "WorkflowStatus" AS ENUM ('UNDER_REVIEW', 'NEED_PRICING', 'NEED_OEM_QUOTE', 'READY_FOR_SUBMISSION', 'SUBMITTED', 'NOT_RELEVANT', 'REJECTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "MatchKind" AS ENUM ('EXACT', 'PHRASE', 'CONTAINS', 'NORMALIZED', 'SYNONYM', 'NEGATIVE');

-- CreateEnum
CREATE TYPE "LocationMatchType" AS ENUM ('EXACT_CITY', 'STATE_MATCH', 'ADDRESS_MATCH', 'NO_MATCH', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ScanTrigger" AS ENUM ('SCHEDULED', 'MANUAL', 'STARTUP', 'DEMO');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('IDLE', 'RUNNING', 'DONE', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('DEBUG', 'INFO', 'WARN', 'ERROR');

-- CreateEnum
CREATE TYPE "UpdateKind" AS ENUM ('CREATED', 'DETAILS_CHANGED', 'CORRIGENDUM', 'DEADLINE_CHANGED', 'ESTIMATED_VALUE_CHANGED', 'EXPIRED', 'CLOSED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "businessName" TEXT,
    "phone" TEXT,
    "notificationEmail" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "onboarded" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Watchlist" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notifyEmail" BOOLEAN NOT NULL DEFAULT true,
    "notifyBrowser" BOOLEAN NOT NULL DEFAULT true,
    "notifyTelegram" BOOLEAN NOT NULL DEFAULT false,
    "notifyWhatsapp" BOOLEAN NOT NULL DEFAULT false,
    "alert24h" BOOLEAN NOT NULL DEFAULT false,
    "alert12h" BOOLEAN NOT NULL DEFAULT false,
    "alert3h" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Watchlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchlistKeyword" (
    "id" TEXT NOT NULL,
    "watchlistId" TEXT NOT NULL,
    "keywordId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WatchlistKeyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchlistLocation" (
    "id" TEXT NOT NULL,
    "watchlistId" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'ALL_INDIA',
    "stateId" TEXT,
    "cityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WatchlistLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedSearch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "notify" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedSearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Keyword" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT,
    "keyword" TEXT NOT NULL,
    "synonyms" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Keyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NegativeKeyword" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "categoryId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NegativeKeyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "State" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "shortName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "State_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "City" (
    "id" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "isCapital" BOOLEAN NOT NULL DEFAULT false,
    "lat" DECIMAL(9,6),
    "lng" DECIMAL(9,6),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StateLoc" (
    "id" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'STATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StateLoc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StateLocCity" (
    "id" TEXT NOT NULL,
    "stateLocId" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "maxRadius" INTEGER DEFAULT 50,

    CONSTRAINT "StateLocCity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tender" (
    "id" TEXT NOT NULL,
    "bidNumber" TEXT NOT NULL,
    "raNumber" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "subCategory" TEXT,
    "bidType" TEXT,
    "ministry" TEXT,
    "organization" TEXT,
    "department" TEXT,
    "buyerName" TEXT,
    "buyerAddress" TEXT,
    "consigneeState" TEXT,
    "consigneeCity" TEXT,
    "consigneeAddress" TEXT,
    "stateCode" TEXT,
    "cityNormalized" TEXT,
    "bidStartDate" TIMESTAMP(3),
    "bidEndDate" TIMESTAMP(3),
    "bidOpeningDate" TIMESTAMP(3),
    "bidValidityDays" INTEGER,
    "estimatedValue" DECIMAL(14,2),
    "quantity" TEXT,
    "boqTitle" TEXT,
    "sourceUrl" TEXT,
    "status" "TenderStatus" NOT NULL DEFAULT 'NEW',
    "workflowStatus" "WorkflowStatus" NOT NULL DEFAULT 'UNDER_REVIEW',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "duplicateOfId" TEXT,
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "dupCluster" TEXT,
    "contentHash" TEXT,
    "sequence" INTEGER NOT NULL DEFAULT 1,
    "currentlyTracked" BOOLEAN NOT NULL DEFAULT true,
    "firstDetectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastCheckedAt" TIMESTAMP(3),
    "lastModifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notifSentAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "scannedAt" TIMESTAMP(3),
    "regNo" TEXT,
    "itemCount" INTEGER,
    "statusAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tender_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenderCategory" (
    "id" TEXT NOT NULL,
    "tenderId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "matchedBy" TEXT,

    CONSTRAINT "TenderCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenderDocument" (
    "id" TEXT NOT NULL,
    "tenderId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT,
    "kind" TEXT,
    "size" INTEGER,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenderDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenderUpdate" (
    "id" TEXT NOT NULL,
    "tenderId" TEXT NOT NULL,
    "kind" "UpdateKind" NOT NULL DEFAULT 'CREATED',
    "summary" TEXT NOT NULL,
    "changes" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenderUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenderMatch" (
    "id" TEXT NOT NULL,
    "tenderId" TEXT NOT NULL,
    "watchlistId" TEXT,
    "keywordId" TEXT,
    "keyword" TEXT NOT NULL,
    "kind" "MatchKind" NOT NULL DEFAULT 'CONTAINS',
    "where_" TEXT,
    "negative" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenderMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserNote" (
    "id" TEXT NOT NULL,
    "tenderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenderId" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'TENDER',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "tenderId" TEXT,
    "channel" "NotifyChannel" NOT NULL DEFAULT 'EMAIL',
    "status" "NotifyStatus" NOT NULL DEFAULT 'SENT',
    "subject" TEXT,
    "body" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationSetting" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" "NotifyChannel" NOT NULL DEFAULT 'EMAIL',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceRun" (
    "id" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL DEFAULT 'gem',
    "trigger" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "attempted" INTEGER NOT NULL DEFAULT 0,
    "fetched" INTEGER NOT NULL DEFAULT 0,
    "newCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "sourceOk" BOOLEAN NOT NULL DEFAULT false,
    "sourceBlocked" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "error" TEXT,
    "details" JSONB,
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "nextRetryAt" TIMESTAMP(3),

    CONSTRAINT "SourceRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemLog" (
    "id" TEXT NOT NULL,
    "level" "LogLevel" NOT NULL DEFAULT 'INFO',
    "category" TEXT,
    "message" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "meta" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "AppNotice" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'warning',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppNotice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenderStar" (
    "id" TEXT NOT NULL,
    "tenderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenderStar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "Watchlist_userId_idx" ON "Watchlist"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Watchlist_userId_name_key" ON "Watchlist"("userId", "name");

-- CreateIndex
CREATE INDEX "WatchlistKeyword_watchlistId_idx" ON "WatchlistKeyword"("watchlistId");

-- CreateIndex
CREATE INDEX "WatchlistKeyword_keywordId_idx" ON "WatchlistKeyword"("keywordId");

-- CreateIndex
CREATE UNIQUE INDEX "WatchlistKeyword_watchlistId_keywordId_key" ON "WatchlistKeyword"("watchlistId", "keywordId");

-- CreateIndex
CREATE INDEX "WatchlistLocation_watchlistId_idx" ON "WatchlistLocation"("watchlistId");

-- CreateIndex
CREATE INDEX "WatchlistLocation_stateId_idx" ON "WatchlistLocation"("stateId");

-- CreateIndex
CREATE INDEX "WatchlistLocation_cityId_idx" ON "WatchlistLocation"("cityId");

-- CreateIndex
CREATE INDEX "SavedSearch_userId_idx" ON "SavedSearch"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_isActive_idx" ON "Category"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Keyword_keyword_key" ON "Keyword"("keyword");

-- CreateIndex
CREATE INDEX "Keyword_categoryId_idx" ON "Keyword"("categoryId");

-- CreateIndex
CREATE INDEX "NegativeKeyword_categoryId_idx" ON "NegativeKeyword"("categoryId");

-- CreateIndex
CREATE INDEX "NegativeKeyword_keyword_idx" ON "NegativeKeyword"("keyword");

-- CreateIndex
CREATE UNIQUE INDEX "State_code_key" ON "State"("code");

-- CreateIndex
CREATE INDEX "State_name_idx" ON "State"("name");

-- CreateIndex
CREATE INDEX "City_normalized_idx" ON "City"("normalized");

-- CreateIndex
CREATE UNIQUE INDEX "City_stateId_name_key" ON "City"("stateId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "StateLoc_stateId_key" ON "StateLoc"("stateId");

-- CreateIndex
CREATE INDEX "StateLocCity_cityId_idx" ON "StateLocCity"("cityId");

-- CreateIndex
CREATE UNIQUE INDEX "StateLocCity_stateLocId_cityId_key" ON "StateLocCity"("stateLocId", "cityId");

-- CreateIndex
CREATE UNIQUE INDEX "Tender_bidNumber_key" ON "Tender"("bidNumber");

-- CreateIndex
CREATE INDEX "Tender_status_idx" ON "Tender"("status");

-- CreateIndex
CREATE INDEX "Tender_workflowStatus_idx" ON "Tender"("workflowStatus");

-- CreateIndex
CREATE INDEX "Tender_bidEndDate_idx" ON "Tender"("bidEndDate");

-- CreateIndex
CREATE INDEX "Tender_stateCode_idx" ON "Tender"("stateCode");

-- CreateIndex
CREATE INDEX "Tender_category_idx" ON "Tender"("category");

-- CreateIndex
CREATE INDEX "Tender_firstDetectedAt_idx" ON "Tender"("firstDetectedAt");

-- CreateIndex
CREATE INDEX "Tender_createdAt_idx" ON "Tender"("createdAt");

-- CreateIndex
CREATE INDEX "Tender_isDemo_idx" ON "Tender"("isDemo");

-- CreateIndex
CREATE INDEX "Tender_isDuplicate_idx" ON "Tender"("isDuplicate");

-- CreateIndex
CREATE INDEX "TenderCategory_categoryId_idx" ON "TenderCategory"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "TenderCategory_tenderId_categoryId_key" ON "TenderCategory"("tenderId", "categoryId");

-- CreateIndex
CREATE INDEX "TenderDocument_tenderId_idx" ON "TenderDocument"("tenderId");

-- CreateIndex
CREATE INDEX "TenderUpdate_tenderId_idx" ON "TenderUpdate"("tenderId");

-- CreateIndex
CREATE INDEX "TenderUpdate_detectedAt_idx" ON "TenderUpdate"("detectedAt");

-- CreateIndex
CREATE INDEX "TenderMatch_tenderId_idx" ON "TenderMatch"("tenderId");

-- CreateIndex
CREATE INDEX "TenderMatch_watchlistId_idx" ON "TenderMatch"("watchlistId");

-- CreateIndex
CREATE INDEX "TenderMatch_keywordId_idx" ON "TenderMatch"("keywordId");

-- CreateIndex
CREATE INDEX "UserNote_userId_idx" ON "UserNote"("userId");

-- CreateIndex
CREATE INDEX "UserNote_tenderId_idx" ON "UserNote"("tenderId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- CreateIndex
CREATE INDEX "Notification_tenderId_idx" ON "Notification"("tenderId");

-- CreateIndex
CREATE INDEX "NotificationLog_userId_idx" ON "NotificationLog"("userId");

-- CreateIndex
CREATE INDEX "NotificationLog_createdAt_idx" ON "NotificationLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationSetting_userId_channel_key" ON "NotificationSetting"("userId", "channel");

-- CreateIndex
CREATE INDEX "SourceRun_status_idx" ON "SourceRun"("status");

-- CreateIndex
CREATE INDEX "SourceRun_startedAt_idx" ON "SourceRun"("startedAt");

-- CreateIndex
CREATE INDEX "SystemLog_createdAt_idx" ON "SystemLog"("createdAt");

-- CreateIndex
CREATE INDEX "SystemLog_level_idx" ON "SystemLog"("level");

-- CreateIndex
CREATE INDEX "SystemLog_category_idx" ON "SystemLog"("category");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AppNotice_active_idx" ON "AppNotice"("active");

-- CreateIndex
CREATE INDEX "TenderStar_userId_idx" ON "TenderStar"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TenderStar_tenderId_userId_key" ON "TenderStar"("tenderId", "userId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Watchlist" ADD CONSTRAINT "Watchlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistKeyword" ADD CONSTRAINT "WatchlistKeyword_watchlistId_fkey" FOREIGN KEY ("watchlistId") REFERENCES "Watchlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistKeyword" ADD CONSTRAINT "WatchlistKeyword_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "Keyword"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistLocation" ADD CONSTRAINT "WatchlistLocation_watchlistId_fkey" FOREIGN KEY ("watchlistId") REFERENCES "Watchlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistLocation" ADD CONSTRAINT "WatchlistLocation_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistLocation" ADD CONSTRAINT "WatchlistLocation_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedSearch" ADD CONSTRAINT "SavedSearch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Keyword" ADD CONSTRAINT "Keyword_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NegativeKeyword" ADD CONSTRAINT "NegativeKeyword_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "City" ADD CONSTRAINT "City_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StateLoc" ADD CONSTRAINT "StateLoc_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StateLocCity" ADD CONSTRAINT "StateLocCity_stateLocId_fkey" FOREIGN KEY ("stateLocId") REFERENCES "StateLoc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StateLocCity" ADD CONSTRAINT "StateLocCity_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tender" ADD CONSTRAINT "Tender_duplicateOfId_fkey" FOREIGN KEY ("duplicateOfId") REFERENCES "Tender"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenderCategory" ADD CONSTRAINT "TenderCategory_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenderCategory" ADD CONSTRAINT "TenderCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenderDocument" ADD CONSTRAINT "TenderDocument_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenderUpdate" ADD CONSTRAINT "TenderUpdate_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenderMatch" ADD CONSTRAINT "TenderMatch_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenderMatch" ADD CONSTRAINT "TenderMatch_watchlistId_fkey" FOREIGN KEY ("watchlistId") REFERENCES "Watchlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenderMatch" ADD CONSTRAINT "TenderMatch_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "Keyword"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserNote" ADD CONSTRAINT "UserNote_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserNote" ADD CONSTRAINT "UserNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationSetting" ADD CONSTRAINT "NotificationSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenderStar" ADD CONSTRAINT "TenderStar_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenderStar" ADD CONSTRAINT "TenderStar_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
