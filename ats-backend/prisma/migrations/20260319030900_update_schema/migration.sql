/*
  Warnings:

  - The primary key for the `ai_usage` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `ai_usage` table. All the data in the column will be lost.
  - The primary key for the `analyses` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `analyses` table. All the data in the column will be lost.
  - The primary key for the `audit_logs` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `audit_logs` table. All the data in the column will be lost.
  - The primary key for the `job_descriptions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `job_descriptions` table. All the data in the column will be lost.
  - The primary key for the `resume_versions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `resume_versions` table. All the data in the column will be lost.
  - The primary key for the `resumes` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `resumes` table. All the data in the column will be lost.
  - The primary key for the `subscriptions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `subscriptions` table. All the data in the column will be lost.
  - The primary key for the `templates` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `templates` table. All the data in the column will be lost.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `users` table. All the data in the column will be lost.
  - The required column `_id` was added to the `ai_usage` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - The required column `_id` was added to the `analyses` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - The required column `_id` was added to the `audit_logs` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - The required column `_id` was added to the `job_descriptions` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - The required column `_id` was added to the `resume_versions` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - The required column `_id` was added to the `resumes` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - The required column `_id` was added to the `subscriptions` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - The required column `_id` was added to the `templates` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - The required column `_id` was added to the `users` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- CreateTable
CREATE TABLE "refresh_sessions" (
    "_id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "revokedAt" DATETIME,
    "replacedBySessionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" DATETIME,
    CONSTRAINT "refresh_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ai_usage" (
    "_id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "aiProvider" TEXT NOT NULL,
    "model" TEXT,
    "tokensUsed" INTEGER,
    "estimatedCost" TEXT,
    "requestSummary" TEXT,
    "responseSummary" TEXT,
    "responseTimeMs" INTEGER,
    "wasCached" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("_id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ai_usage" ("aiProvider", "createdAt", "date", "estimatedCost", "feature", "model", "requestSummary", "responseSummary", "responseTimeMs", "tokensUsed", "userId", "wasCached") SELECT "aiProvider", "createdAt", "date", "estimatedCost", "feature", "model", "requestSummary", "responseSummary", "responseTimeMs", "tokensUsed", "userId", "wasCached" FROM "ai_usage";
DROP TABLE "ai_usage";
ALTER TABLE "new_ai_usage" RENAME TO "ai_usage";
CREATE TABLE "new_analyses" (
    "_id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "jobDescriptionId" TEXT,
    "analysisType" TEXT NOT NULL,
    "aiProvider" TEXT,
    "modelUsed" TEXT,
    "results" TEXT NOT NULL,
    "processingTimeMs" INTEGER,
    "tokensUsed" INTEGER,
    "estimatedCost" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "analyses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("_id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "analyses_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "resumes" ("_id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "analyses_jobDescriptionId_fkey" FOREIGN KEY ("jobDescriptionId") REFERENCES "job_descriptions" ("_id") ON DELETE SET NULL ON UPDATE NO ACTION
);
INSERT INTO "new_analyses" ("aiProvider", "analysisType", "completedAt", "createdAt", "errorMessage", "estimatedCost", "jobDescriptionId", "modelUsed", "processingTimeMs", "results", "resumeId", "status", "tokensUsed", "userId") SELECT "aiProvider", "analysisType", "completedAt", "createdAt", "errorMessage", "estimatedCost", "jobDescriptionId", "modelUsed", "processingTimeMs", "results", "resumeId", "status", "tokensUsed", "userId" FROM "analyses";
DROP TABLE "analyses";
ALTER TABLE "new_analyses" RENAME TO "analyses";
CREATE INDEX "analyses_userId_createdAt_idx" ON "analyses"("userId", "createdAt");
CREATE INDEX "analyses_resumeId_idx" ON "analyses"("resumeId");
CREATE TABLE "new_audit_logs" (
    "_id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "changes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("_id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_audit_logs" ("action", "changes", "createdAt", "entityId", "entityType", "ipAddress", "userAgent", "userId") SELECT "action", "changes", "createdAt", "entityId", "entityType", "ipAddress", "userAgent", "userId" FROM "audit_logs";
DROP TABLE "audit_logs";
ALTER TABLE "new_audit_logs" RENAME TO "audit_logs";
CREATE TABLE "new_job_descriptions" (
    "_id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT,
    "location" TEXT,
    "description" TEXT NOT NULL,
    "extractedData" TEXT,
    "sourceUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "job_descriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("_id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_job_descriptions" ("company", "createdAt", "deletedAt", "description", "extractedData", "location", "sourceUrl", "title", "updatedAt", "userId") SELECT "company", "createdAt", "deletedAt", "description", "extractedData", "location", "sourceUrl", "title", "updatedAt", "userId" FROM "job_descriptions";
DROP TABLE "job_descriptions";
ALTER TABLE "new_job_descriptions" RENAME TO "job_descriptions";
CREATE INDEX "job_descriptions_userId_deletedAt_updatedAt_idx" ON "job_descriptions"("userId", "deletedAt", "updatedAt");
CREATE TABLE "new_resume_versions" (
    "_id" TEXT NOT NULL PRIMARY KEY,
    "resumeId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "content" TEXT,
    "structuredData" TEXT,
    "extractedText" TEXT,
    "originalFileId" TEXT,
    "originalFileName" TEXT,
    "originalFileSize" INTEGER,
    "originalFileType" TEXT,
    "changeSummary" TEXT,
    "changedByUserId" TEXT,
    "changeType" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "resume_versions_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "resumes" ("_id") ON DELETE CASCADE ON UPDATE NO ACTION
);
INSERT INTO "new_resume_versions" ("changeSummary", "changeType", "changedByUserId", "content", "createdAt", "extractedText", "originalFileId", "originalFileName", "originalFileSize", "originalFileType", "resumeId", "structuredData", "versionNumber") SELECT "changeSummary", "changeType", "changedByUserId", "content", "createdAt", "extractedText", "originalFileId", "originalFileName", "originalFileSize", "originalFileType", "resumeId", "structuredData", "versionNumber" FROM "resume_versions";
DROP TABLE "resume_versions";
ALTER TABLE "new_resume_versions" RENAME TO "resume_versions";
CREATE INDEX "resume_versions_resumeId_createdAt_idx" ON "resume_versions"("resumeId", "createdAt");
CREATE UNIQUE INDEX "resume_versions_resumeId_versionNumber_key" ON "resume_versions"("resumeId", "versionNumber");
CREATE TABLE "new_resumes" (
    "_id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "templateId" TEXT,
    "content" TEXT,
    "structuredData" TEXT,
    "extractedText" TEXT,
    "originalFileId" TEXT,
    "originalFileName" TEXT,
    "originalFileSize" INTEGER,
    "originalFileType" TEXT,
    "fileProcessedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "aiOptimizedForJdId" TEXT,
    "optimizationScore" INTEGER,
    "exportedPdfUrl" TEXT,
    "exportedDocxUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastAccessedAt" DATETIME,
    "deletedAt" DATETIME,
    "version" INTEGER NOT NULL DEFAULT 1,
    "parentResumeId" TEXT,
    CONSTRAINT "resumes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "resumes_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "templates" ("_id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "resumes_aiOptimizedForJdId_fkey" FOREIGN KEY ("aiOptimizedForJdId") REFERENCES "job_descriptions" ("_id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "resumes_parentResumeId_fkey" FOREIGN KEY ("parentResumeId") REFERENCES "resumes" ("_id") ON DELETE NO ACTION ON UPDATE NO ACTION
);
INSERT INTO "new_resumes" ("aiOptimizedForJdId", "content", "createdAt", "deletedAt", "exportedDocxUrl", "exportedPdfUrl", "extractedText", "fileProcessedAt", "isPublic", "lastAccessedAt", "optimizationScore", "originalFileId", "originalFileName", "originalFileSize", "originalFileType", "parentResumeId", "status", "structuredData", "templateId", "title", "updatedAt", "userId", "version") SELECT "aiOptimizedForJdId", "content", "createdAt", "deletedAt", "exportedDocxUrl", "exportedPdfUrl", "extractedText", "fileProcessedAt", "isPublic", "lastAccessedAt", "optimizationScore", "originalFileId", "originalFileName", "originalFileSize", "originalFileType", "parentResumeId", "status", "structuredData", "templateId", "title", "updatedAt", "userId", "version" FROM "resumes";
DROP TABLE "resumes";
ALTER TABLE "new_resumes" RENAME TO "resumes";
CREATE INDEX "resumes_userId_deletedAt_updatedAt_idx" ON "resumes"("userId", "deletedAt", "updatedAt");
CREATE TABLE "new_subscriptions" (
    "_id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "trialEndDate" DATETIME,
    "cancelledAt" DATETIME,
    "customLimits" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("_id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_subscriptions" ("cancelledAt", "createdAt", "customLimits", "endDate", "startDate", "status", "stripeCustomerId", "stripeSubscriptionId", "tier", "trialEndDate", "updatedAt", "userId") SELECT "cancelledAt", "createdAt", "customLimits", "endDate", "startDate", "status", "stripeCustomerId", "stripeSubscriptionId", "tier", "trialEndDate", "updatedAt", "userId" FROM "subscriptions";
DROP TABLE "subscriptions";
ALTER TABLE "new_subscriptions" RENAME TO "subscriptions";
CREATE UNIQUE INDEX "subscriptions_userId_key" ON "subscriptions"("userId");
CREATE TABLE "new_templates" (
    "_id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "design" TEXT NOT NULL,
    "structure" TEXT,
    "defaultData" TEXT,
    "previewImageUrl" TEXT,
    "demoResumeId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "atsScore" INTEGER,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_templates" ("atsScore", "category", "createdAt", "defaultData", "demoResumeId", "description", "design", "isActive", "isPremium", "name", "previewImageUrl", "structure", "updatedAt", "usageCount") SELECT "atsScore", "category", "createdAt", "defaultData", "demoResumeId", "description", "design", "isActive", "isPremium", "name", "previewImageUrl", "structure", "updatedAt", "usageCount" FROM "templates";
DROP TABLE "templates";
ALTER TABLE "new_templates" RENAME TO "templates";
CREATE UNIQUE INDEX "templates_name_key" ON "templates"("name");
CREATE TABLE "new_users" (
    "_id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "profilePictureUrl" TEXT,
    "subscriptionTier" TEXT NOT NULL DEFAULT 'free',
    "subscriptionStartDate" DATETIME,
    "subscriptionEndDate" DATETIME,
    "resumesCreated" INTEGER NOT NULL DEFAULT 0,
    "analysesRunToday" INTEGER NOT NULL DEFAULT 0,
    "lastAnalysisDate" DATETIME,
    "aiGenerationsToday" INTEGER NOT NULL DEFAULT 0,
    "aiOptimizationsToday" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastLoginAt" DATETIME,
    "deletedAt" DATETIME,
    "settings" TEXT NOT NULL DEFAULT '{}'
);
INSERT INTO "new_users" ("aiGenerationsToday", "aiOptimizationsToday", "analysesRunToday", "createdAt", "deletedAt", "email", "emailVerified", "firstName", "lastAnalysisDate", "lastLoginAt", "lastName", "passwordHash", "phone", "profilePictureUrl", "resumesCreated", "settings", "subscriptionEndDate", "subscriptionStartDate", "subscriptionTier", "updatedAt") SELECT "aiGenerationsToday", "aiOptimizationsToday", "analysesRunToday", "createdAt", "deletedAt", "email", "emailVerified", "firstName", "lastAnalysisDate", "lastLoginAt", "lastName", "passwordHash", "phone", "profilePictureUrl", "resumesCreated", "settings", "subscriptionEndDate", "subscriptionStartDate", "subscriptionTier", "updatedAt" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "refresh_sessions_tokenHash_key" ON "refresh_sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_sessions_userId_revokedAt_idx" ON "refresh_sessions"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "refresh_sessions_expiresAt_idx" ON "refresh_sessions"("expiresAt");
