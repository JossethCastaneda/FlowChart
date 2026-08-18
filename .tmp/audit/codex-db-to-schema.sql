-- DropForeignKey
ALTER TABLE "AssetGroup" DROP CONSTRAINT "AssetGroup_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "ModelDecision" DROP CONSTRAINT "ModelDecision_aiRunId_fkey";

-- DropForeignKey
ALTER TABLE "ModelDecision" DROP CONSTRAINT "ModelDecision_workspaceId_fkey";

-- AlterTable
ALTER TABLE "BillingRecoveryPolicy" DROP COLUMN "graceBudgetPercent",
DROP COLUMN "hardLimitUsd";

-- AlterTable
ALTER TABLE "MediaAsset" DROP COLUMN "tags";

-- AlterTable
ALTER TABLE "ScheduledPost" DROP COLUMN "targets";

-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "currentPeriodStart";

-- DropTable
DROP TABLE "AssetGroup";

-- DropTable
DROP TABLE "ModelDecision";
