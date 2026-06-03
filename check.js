const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.project.findMany().then(p => {
  console.log(p.map(x => ({ id: x.id, alias: x.alias, status: x.status })));
  prisma.$disconnect();
});
