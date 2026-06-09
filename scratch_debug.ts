import "dotenv/config";
import prisma from "./lib/prisma";

async function main() {
  console.log("=== DB DEBUG ===");
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true }
  });
  console.log("Users:", JSON.stringify(users, null, 2));

  const workspaces = await prisma.workspace.findMany({
    include: {
      members: {
        include: {
          user: {
            select: { name: true, email: true }
          }
        }
      }
    }
  });
  console.log("Workspaces:", JSON.stringify(workspaces, null, 2));

  const projects = await prisma.project.findMany({
    select: {
      id: true,
      name: true,
      client: true,
      workspaceId: true,
      createdAt: true
    }
  });
  console.log("Projects:", JSON.stringify(projects, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
