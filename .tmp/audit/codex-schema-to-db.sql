-- AlterTable
ALTER TABLE "public"."MediaAsset" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "public"."ScheduledPost" ADD COLUMN     "targets" JSONB;

-- AlterTable
ALTER TABLE "public"."Subscription" ADD COLUMN     "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "public"."BillingRecoveryPolicy" ADD COLUMN     "graceBudgetPercent" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
ADD COLUMN     "hardLimitUsd" DECIMAL(19,4) NOT NULL DEFAULT 0.00;

-- CreateTable
CREATE TABLE "public"."AssetGroup" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT DEFAULT '#35D3D9',
    "type" TEXT NOT NULL DEFAULT 'publish',
    "assets" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ModelDecision" (
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

-- CreateIndex
CREATE INDEX "AssetGroup_workspaceId_idx" ON "public"."AssetGroup"("workspaceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ModelDecision_aiRunId_key" ON "public"."ModelDecision"("aiRunId" ASC);

-- CreateIndex
CREATE INDEX "ModelDecision_workspaceId_idx" ON "public"."ModelDecision"("workspaceId" ASC);

-- AddForeignKey
ALTER TABLE "public"."AssetGroup" ADD CONSTRAINT "AssetGroup_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ModelDecision" ADD CONSTRAINT "ModelDecision_aiRunId_fkey" FOREIGN KEY ("aiRunId") REFERENCES "public"."AiRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ModelDecision" ADD CONSTRAINT "ModelDecision_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
