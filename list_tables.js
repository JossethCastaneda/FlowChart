const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`.then(tables => {
  console.log(tables);
  process.exit(0);
});
