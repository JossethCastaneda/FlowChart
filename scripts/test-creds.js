const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const intg = await prisma.integration.findFirst({
    where: { provider: 'google' }
  });
  console.log(JSON.stringify(intg.credentials, null, 2));
}

main().finally(() => prisma.$disconnect());
