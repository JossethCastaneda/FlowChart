-- AlterTable: cross-area request fields (Capa 3)
ALTER TABLE "Task" ADD COLUMN "targetAreaId" TEXT;
ALTER TABLE "Task" ADD COLUMN "requestType" TEXT;
ALTER TABLE "Task" ADD COLUMN "requesterId" TEXT;
