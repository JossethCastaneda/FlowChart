import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const msgs = await prisma.inboxMessage.findMany({ 
    where: { content: 'llll' }
  });
  console.log(JSON.stringify(msgs, null, 2));
}
main().finally(() => prisma.$disconnect());
