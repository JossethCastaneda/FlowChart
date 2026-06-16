const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({ select: { email: true, password: true } });
  console.log(users.map(u => ({ email: u.email, hasPassword: !!u.password })));
}
main().finally(() => prisma.$disconnect());
