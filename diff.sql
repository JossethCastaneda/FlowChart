DELETE FROM "AiUsage";
-- AlterTable
ALTER TABLE "AiUsage" DROP COLUMN "estimatedCostUsd",
ADD COLUMN     "customerChargeUsd" DECIMAL(19,4),
ADD COLUMN     "idempotencyKey" TEXT NOT NULL,
ADD COLUMN     "providerCostUsd" DECIMAL(19,4),
ADD COLUMN     "requestId" TEXT;

-- CreateTable
CREATE TABLE "AiRequest" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AiRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiRun" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "actualProviderModelId" TEXT NOT NULL,
    "promptVersion" TEXT,
    "workflowVersion" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "latencyMs" INTEGER,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "cachedTokens" INTEGER NOT NULL DEFAULT 0,
    "providerCost" DECIMAL(19,4),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "fallbackFromRunId" TEXT,
    "errorCode" TEXT,

    CONSTRAINT "AiRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiModelPricing" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerModelId" TEXT NOT NULL,
    "inputPrice" DECIMAL(19,6) NOT NULL,
    "outputPrice" DECIMAL(19,6) NOT NULL,
    "cachedInputPrice" DECIMAL(19,6),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "sourceMetadata" TEXT,

    CONSTRAINT "AiModelPricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeaturePricing" (
    "id" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "pricingMode" TEXT NOT NULL,
    "fixedCost" DECIMAL(19,4),
    "creditsCost" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeaturePricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceEntitlement" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "saasPlan" TEXT NOT NULL DEFAULT 'FREE',
    "allowedFeatures" TEXT[],
    "monthlyAiBudget" DECIMAL(19,4),
    "autopilotEnabled" BOOLEAN NOT NULL DEFAULT false,
    "dailyAutopilotAiBudget" DECIMAL(19,4),
    "maxAiCostPerRun" DECIMAL(19,4),
    "availableCredits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceEntitlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingCustomer" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "stripeCustomerId" TEXT NOT NULL,

    CONSTRAINT "BillingCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingEvent" (
    "id" TEXT NOT NULL,
    "stripeEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "livemode" BOOLEAN NOT NULL,
    "processingStatus" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "BillingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingUsageEvent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "aiUsageId" TEXT NOT NULL,
    "stripeMeterEventIdentifier" TEXT NOT NULL,
    "meterName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "sentAt" TIMESTAMP(3),
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAttemptAt" TIMESTAMP(3),
    "nextAttemptAt" TIMESTAMP(3),

    CONSTRAINT "BillingUsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "stripeInvoiceId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "amountDue" INTEGER NOT NULL,
    "amountPaid" INTEGER NOT NULL,
    "hostedInvoiceUrl" TEXT,
    "billingPeriod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceAiBudgetBalance" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "customerAiAllowance" DECIMAL(19,4) NOT NULL DEFAULT 0.00,
    "customerBilledUsd" DECIMAL(19,4) NOT NULL DEFAULT 0.00,
    "customerReservedUsd" DECIMAL(19,4) NOT NULL DEFAULT 0.00,
    "internalProviderSpendLimit" DECIMAL(19,4) NOT NULL DEFAULT 0.00,
    "internalProviderCostUsd" DECIMAL(19,4) NOT NULL DEFAULT 0.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceAiBudgetBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiReservationLedger" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "reservedCostUsd" DECIMAL(19,4) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RESERVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" TIMESTAMP(3),

    CONSTRAINT "AiReservationLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalCostRate" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "component" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "amount" DECIMAL(19,6) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "sourceUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalCostRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanVersion" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "basePriceUsd" DECIMAL(19,4) NOT NULL,
    "annualPriceUsd" DECIMAL(19,4) NOT NULL,
    "includedSeats" INTEGER NOT NULL DEFAULT 1,
    "includedWs" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanPrice" (
    "id" TEXT NOT NULL,
    "planVersionId" TEXT NOT NULL,
    "stripePriceId" TEXT NOT NULL,
    "billingPeriod" TEXT NOT NULL,

    CONSTRAINT "PlanPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Module" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "implementationType" TEXT NOT NULL,
    "isPurchasable" BOOLEAN NOT NULL DEFAULT false,
    "isAddon" BOOLEAN NOT NULL DEFAULT false,
    "frontendRoute" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanModule" (
    "id" TEXT NOT NULL,
    "planVersionId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "inclusion" TEXT NOT NULL,
    "usageLimit" INTEGER,

    CONSTRAINT "PlanModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiPackage" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiPackageVersion" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "feeMode" TEXT NOT NULL DEFAULT 'INCLUDED_IN_PLAN',
    "baseFeeUsd" DECIMAL(19,4) NOT NULL,
    "includedUnits" INTEGER NOT NULL DEFAULT 0,
    "variableUnitPrice" DECIMAL(19,6) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiPackageVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingLedgerEntry" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit" TEXT NOT NULL,
    "unitAmount" DECIMAL(19,4) NOT NULL,
    "subtotal" DECIMAL(19,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingProfile" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "legalName" TEXT,
    "entityType" TEXT,
    "billingEmail" TEXT,
    "country" TEXT,
    "address" TEXT,
    "taxIdType" TEXT,
    "taxId" TEXT,
    "fiscalMetadata" JSONB,
    "notifyOwner" BOOLEAN NOT NULL DEFAULT true,
    "paymentFailedEmail" BOOLEAN NOT NULL DEFAULT true,
    "invoiceAvailableEmail" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingRecoveryPolicy" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "gracePeriodDays" INTEGER NOT NULL DEFAULT 3,
    "notificationSchedule" JSONB NOT NULL DEFAULT '[]',
    "aiRestrictionPointDays" INTEGER NOT NULL DEFAULT 3,
    "serviceRestrictionDays" INTEGER NOT NULL DEFAULT 7,
    "unpaidBehavior" TEXT NOT NULL DEFAULT 'suspend',
    "cancellationBehavior" TEXT NOT NULL DEFAULT 'revoke_access',
    "hardLimitUsd" DECIMAL(19,4) NOT NULL DEFAULT 0.00,
    "graceBudgetPercent" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingRecoveryPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelDecision" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "aiRunId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "candidates" TEXT[],
    "selectedMode" TEXT NOT NULL,
    "powerTier" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModelDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FiscalDocument" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "status" TEXT NOT NULL,
    "uuid" TEXT,
    "xmlUrl" TEXT,
    "pdfUrl" TEXT,
    "issuedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "jurisdiction" TEXT NOT NULL DEFAULT 'MX',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FiscalDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingNotification" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "type" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "providerMsgId" TEXT,
    "lastError" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingRecoveryCase" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "gracePeriodEnd" TIMESTAMP(3),
    "restrictedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingRecoveryCase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiRequest_idempotencyKey_key" ON "AiRequest"("idempotencyKey");

-- CreateIndex
CREATE INDEX "AiRequest_workspaceId_idx" ON "AiRequest"("workspaceId");

-- CreateIndex
CREATE INDEX "AiRequest_status_idx" ON "AiRequest"("status");

-- CreateIndex
CREATE INDEX "AiRun_requestId_idx" ON "AiRun"("requestId");

-- CreateIndex
CREATE INDEX "AiRun_workspaceId_idx" ON "AiRun"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "AiModelPricing_provider_providerModelId_effectiveFrom_key" ON "AiModelPricing"("provider", "providerModelId", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "FeaturePricing_feature_key" ON "FeaturePricing"("feature");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceEntitlement_workspaceId_key" ON "WorkspaceEntitlement"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "BillingCustomer_workspaceId_key" ON "BillingCustomer"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "BillingCustomer_stripeCustomerId_key" ON "BillingCustomer"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_workspaceId_key" ON "Subscription"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "BillingEvent_stripeEventId_key" ON "BillingEvent"("stripeEventId");

-- CreateIndex
CREATE UNIQUE INDEX "BillingUsageEvent_aiUsageId_key" ON "BillingUsageEvent"("aiUsageId");

-- CreateIndex
CREATE UNIQUE INDEX "BillingUsageEvent_stripeMeterEventIdentifier_key" ON "BillingUsageEvent"("stripeMeterEventIdentifier");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_stripeInvoiceId_key" ON "Invoice"("stripeInvoiceId");

-- CreateIndex
CREATE INDEX "WorkspaceAiBudgetBalance_workspaceId_periodStart_periodEnd_idx" ON "WorkspaceAiBudgetBalance"("workspaceId", "periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceAiBudgetBalance_workspaceId_periodStart_periodEnd_key" ON "WorkspaceAiBudgetBalance"("workspaceId", "periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "AiReservationLedger_idempotencyKey_key" ON "AiReservationLedger"("idempotencyKey");

-- CreateIndex
CREATE INDEX "AiReservationLedger_workspaceId_status_idx" ON "AiReservationLedger"("workspaceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_key_key" ON "Plan"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Module_key_key" ON "Module"("key");

-- CreateIndex
CREATE UNIQUE INDEX "PlanModule_planVersionId_moduleId_key" ON "PlanModule"("planVersionId", "moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "AiPackage_key_key" ON "AiPackage"("key");

-- CreateIndex
CREATE UNIQUE INDEX "BillingProfile_workspaceId_key" ON "BillingProfile"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "ModelDecision_aiRunId_key" ON "ModelDecision"("aiRunId");

-- CreateIndex
CREATE INDEX "ModelDecision_workspaceId_idx" ON "ModelDecision"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "FiscalDocument_uuid_key" ON "FiscalDocument"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "BillingNotification_idempotencyKey_key" ON "BillingNotification"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "AiUsage_idempotencyKey_key" ON "AiUsage"("idempotencyKey");

-- CreateIndex
CREATE INDEX "AiUsage_requestId_idx" ON "AiUsage"("requestId");

-- AddForeignKey
ALTER TABLE "AiRequest" ADD CONSTRAINT "AiRequest_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiRun" ADD CONSTRAINT "AiRun_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "AiRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiRun" ADD CONSTRAINT "AiRun_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsage" ADD CONSTRAINT "AiUsage_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "AiRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceEntitlement" ADD CONSTRAINT "WorkspaceEntitlement_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingCustomer" ADD CONSTRAINT "BillingCustomer_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceAiBudgetBalance" ADD CONSTRAINT "WorkspaceAiBudgetBalance_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiReservationLedger" ADD CONSTRAINT "AiReservationLedger_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanVersion" ADD CONSTRAINT "PlanVersion_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanPrice" ADD CONSTRAINT "PlanPrice_planVersionId_fkey" FOREIGN KEY ("planVersionId") REFERENCES "PlanVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanModule" ADD CONSTRAINT "PlanModule_planVersionId_fkey" FOREIGN KEY ("planVersionId") REFERENCES "PlanVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanModule" ADD CONSTRAINT "PlanModule_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiPackageVersion" ADD CONSTRAINT "AiPackageVersion_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "AiPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingLedgerEntry" ADD CONSTRAINT "BillingLedgerEntry_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingProfile" ADD CONSTRAINT "BillingProfile_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelDecision" ADD CONSTRAINT "ModelDecision_aiRunId_fkey" FOREIGN KEY ("aiRunId") REFERENCES "AiRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelDecision" ADD CONSTRAINT "ModelDecision_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FiscalDocument" ADD CONSTRAINT "FiscalDocument_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingNotification" ADD CONSTRAINT "BillingNotification_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingRecoveryCase" ADD CONSTRAINT "BillingRecoveryCase_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
