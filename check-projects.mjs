import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const workspaces = await prisma.workspace.findMany({ select: { id: true, name: true } });
  console.log("Workspaces:", workspaces);

  const projects = await prisma.project.findMany({ select: { id: true, name: true, workspaceId: true } });
  console.log("Projects:", projects);
}

main().finally(() => prisma.$disconnect());
