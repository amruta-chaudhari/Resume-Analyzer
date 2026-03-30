ALTER TABLE "users" ADD COLUMN "llmMonthlyRequestLimit" INTEGER;
ALTER TABLE "users" ADD COLUMN "llmAllowedProviders" TEXT;
ALTER TABLE "users" ADD COLUMN "llmOpenRouterKey" TEXT;
ALTER TABLE "users" ADD COLUMN "llmOpenAiKey" TEXT;
ALTER TABLE "users" ADD COLUMN "llmGeminiKey" TEXT;
ALTER TABLE "users" ADD COLUMN "llmAnthropicKey" TEXT;
