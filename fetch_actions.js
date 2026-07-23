const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const p = await prisma.project.findUnique({ where: { id: 'cmxxh0kj000004lcr65zc6tr' } });
  console.log("Project:", p.alias, p.client);
  console.log("Channels:", JSON.stringify(p.channels, null, 2));
}
run().catch(console.error).finally(() => prisma.$disconnect());
