import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const res = await prisma.$queryRaw`
    SELECT relname as table_name,
           pg_size_pretty(pg_total_relation_size(relid)) As size,
           pg_total_relation_size(relid) as raw_size
    FROM pg_catalog.pg_statio_user_tables
    ORDER BY pg_total_relation_size(relid) DESC
    LIMIT 10;
  `;
  console.log(res);
}

main().finally(() => prisma.$disconnect());
