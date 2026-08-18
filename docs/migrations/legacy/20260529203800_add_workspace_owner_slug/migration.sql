-- AlterTable: Add ownerId and slug to Workspace
ALTER TABLE "Workspace" ADD COLUMN "ownerId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Workspace" ADD COLUMN "slug" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Remove defaults (they were only for migration safety)
ALTER TABLE "Workspace" ALTER COLUMN "ownerId" DROP DEFAULT;
ALTER TABLE "Workspace" ALTER COLUMN "slug" DROP DEFAULT;
