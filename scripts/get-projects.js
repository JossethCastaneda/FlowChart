const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, name: true, email: true } });
  console.log("Users:", users);

  const workspaces = await prisma.workspace.findMany({ select: { id: true, name: true, slug: true } });
  console.log("Workspaces:", workspaces);

  const members = await prisma.workspaceMember.findMany({ select: { id: true, workspaceId: true, userId: true } });
  console.log("Members:", members);

  const projects = await prisma.project.findMany({ select: { id: true, name: true, workspaceId: true } });
  console.log("Projects:", projects);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
