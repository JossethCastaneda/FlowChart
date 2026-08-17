-- Drop ownerId FK and column (ownership now tracked via WorkspaceMember role = 'OWNER')
ALTER TABLE "Workspace" DROP CONSTRAINT IF EXISTS "Workspace_ownerId_fkey";
ALTER TABLE "Workspace" DROP COLUMN IF EXISTS "ownerId";

-- Add plan column
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "plan" TEXT NOT NULL DEFAULT 'free';

-- Add acceptedAt column to WorkspaceInvite
ALTER TABLE "WorkspaceInvite" ADD COLUMN IF NOT EXISTS "acceptedAt" TIMESTAMP(3);
