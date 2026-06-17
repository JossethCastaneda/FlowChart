const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const p = await prisma.project.findFirst({where:{name:'LID MARKETING'}});
  console.log("Project Workspace:", p.workspaceId);
  const i = await prisma.integration.findMany({where:{workspaceId:p.workspaceId}});
  console.log(JSON.stringify(i, null, 2));
}
main().catch(console.error).finally(()=>prisma.$disconnect());
