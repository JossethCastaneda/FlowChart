import "dotenv/config";
process.env.DATABASE_URL = "postgresql://neondb_owner:npg_ND2Y8sQTridU@ep-jolly-surf-aqo6s6l7-pooler.c-8.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require";
import prisma from '../lib/prisma.js';

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, name: true, email: true } });
  console.log("Users:", users.length);

  const workspaces = await prisma.workspace.findMany({ select: { id: true, name: true, slug: true } });
  console.log("Workspaces:", workspaces.length);

  const projects = await prisma.project.findMany({ select: { id: true, name: true, workspaceId: true } });
  console.log("Projects:", projects.length, projects);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
