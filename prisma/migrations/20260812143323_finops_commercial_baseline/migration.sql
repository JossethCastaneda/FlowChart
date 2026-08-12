-- CreateTable
CREATE TABLE "AiPackage" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiPackage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiPackage_key_key" ON "AiPackage"("key");

-- CreateTable
CREATE TABLE "WorkspaceAiBudgetBalance" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "spentUsd" DECIMAL(19,4) NOT NULL DEFAULT 0.00,
    "reservedUsd" DECIMAL(19,4) NOT NULL DEFAULT 0.00,
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
CREATE TABLE "BillingRecoveryPolicy" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "gracePeriodDays" INTEGER NOT NULL DEFAULT 3,
    "notificationSchedule" JSONB NOT NULL DEFAULT '[]',
    "aiRestrictionPointDays" INTEGER NOT NULL DEFAULT 3,
    "serviceRestrictionDays" INTEGER NOT NULL DEFAULT 7,
    "unpaidBehavior" TEXT NOT NULL DEFAULT 'suspend',
    "cancellationBehavior" TEXT NOT NULL DEFAULT 'revoke_access',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingRecoveryPolicy_pkey" PRIMARY KEY ("id")
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

-- CreateIndex
CREATE INDEX "WorkspaceAiBudgetBalance_workspaceId_period_idx" ON "WorkspaceAiBudgetBalance"("workspaceId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceAiBudgetBalance_workspaceId_period_key" ON "WorkspaceAiBudgetBalance"("workspaceId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "AiReservationLedger_idempotencyKey_key" ON "AiReservationLedger"("idempotencyKey");

-- CreateIndex
CREATE INDEX "AiReservationLedger_workspaceId_status_idx" ON "AiReservationLedger"("workspaceId", "status");

-- AddForeignKey
ALTER TABLE "WorkspaceAiBudgetBalance" ADD CONSTRAINT "WorkspaceAiBudgetBalance_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiReservationLedger" ADD CONSTRAINT "AiReservationLedger_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiPackageVersion" ADD CONSTRAINT "AiPackageVersion_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "AiPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
