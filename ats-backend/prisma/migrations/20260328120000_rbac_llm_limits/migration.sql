-- Create role enum behavior via constrained text column for SQLite
-- (Prisma will map to enum in client)

-- Add access-control and LLM policy columns to users
ALTER TABLE "users" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'USER';
ALTER TABLE "users" ADD COLUMN "llmMonthlyBudgetUsd" REAL;
ALTER TABLE "users" ADD COLUMN "llmMonthlyTokenLimit" INTEGER;
ALTER TABLE "users" ADD COLUMN "llmAllowReasoning" BOOLEAN;
ALTER TABLE "users" ADD COLUMN "llmAllowedModels" TEXT;

-- Backfill role from legacy subscriptionTier-based admin marker
UPDATE "users"
SET "role" = CASE
  WHEN lower("subscriptionTier") = 'admin' THEN 'ADMIN'
  ELSE 'USER'
END;

-- Add extra analysis token visibility fields
ALTER TABLE "analyses" ADD COLUMN "promptTokens" INTEGER;
ALTER TABLE "analyses" ADD COLUMN "completionTokens" INTEGER;

-- Add AiUsage enrichment fields
ALTER TABLE "ai_usage" ADD COLUMN "analysisId" TEXT;
ALTER TABLE "ai_usage" ADD COLUMN "promptTokens" INTEGER;
ALTER TABLE "ai_usage" ADD COLUMN "completionTokens" INTEGER;
ALTER TABLE "ai_usage" ADD COLUMN "costUsd" REAL;
ALTER TABLE "ai_usage" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'completed';
ALTER TABLE "ai_usage" ADD COLUMN "details" TEXT;

-- Add plan-level LLM limits to system settings
ALTER TABLE "system_settings" ADD COLUMN "planLimits" TEXT;

-- Supporting indexes
CREATE INDEX "users_role_idx" ON "users"("role");
CREATE INDEX "ai_usage_userId_createdAt_idx" ON "ai_usage"("userId", "createdAt");
CREATE INDEX "ai_usage_analysisId_idx" ON "ai_usage"("analysisId");
