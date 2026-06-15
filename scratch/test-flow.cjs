require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

async function main() {
  const { PrismaClient } = require('@prisma/client');
  const { PrismaPg } = require('@prisma/adapter-pg');
  const { Pool } = require('pg');

  let connectionString = process.env.DATABASE_URL;
  console.log('DB host:', new URL(connectionString).host);

  // Replicate EXACT production lib/prisma.ts config
  if (connectionString.includes("sslmode=require") && !connectionString.includes("uselibpqcompat")) {
    connectionString += "&uselibpqcompat=true";
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // Simulate the exact /api/projects flow
    console.log('\n=== Simulating /api/projects flow ===');
    
    // Step 1: getActiveWorkspaceId (find first workspace member)
    const t1 = Date.now();
    const firstMember = await prisma.workspaceMember.findFirst({
      orderBy: { workspace: { createdAt: 'asc' } },
      select: { workspaceId: true, userId: true },
    });
    console.log(`Step 1: findFirst workspaceMember - ${Date.now() - t1}ms`);
    console.log('  Result:', firstMember);

    if (!firstMember) {
      console.log('No workspace members found');
      return;
    }

    // Step 2: project.findMany (exact query from /api/projects)
    const t2 = Date.now();
    const projects = await prisma.project.findMany({
      where: { workspaceId: firstMember.workspaceId },
      include: { channels: true },
      orderBy: { createdAt: 'desc' },
    });
    console.log(`Step 2: findMany projects - ${Date.now() - t2}ms`);
    console.log(`  Found ${projects.length} projects`);
    projects.slice(0, 3).forEach(p => {
      console.log(`  - ${p.alias || p.name} (${p.status}) - ${p.channels.length} channels`);
    });

    // Step 3: connect/status flow
    const t3 = Date.now();
    const integrations = await prisma.integration.findMany({
      where: {
        workspaceId: firstMember.workspaceId,
        provider: { startsWith: 'meta' },
      },
    });
    console.log(`Step 3: findMany integrations - ${Date.now() - t3}ms`);
    console.log(`  Found ${integrations.length} meta integrations`);

    console.log('\n✅ ALL STEPS PASSED - Production DB is fully functional');
    
  } catch (err) {
    console.error('\n❌ ERROR:', err.message);
    console.error('Name:', err.constructor.name);
    console.error('Stack:', err.stack?.slice(0, 300));
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

main();
