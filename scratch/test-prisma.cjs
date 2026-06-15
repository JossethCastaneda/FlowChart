require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

async function main() {
  try {
    // Import Prisma client the same way the app does
    const { PrismaClient } = require('@prisma/client');
    const { PrismaPg } = require('@prisma/adapter-pg');
    const { Pool } = require('pg');

    let connectionString = process.env.DATABASE_URL || process.env.STORAGE_DATABASE_URL;
    console.log('DB host:', new URL(connectionString).host);

    // Same logic as lib/prisma.ts
    connectionString = connectionString.replace("sslmode=require", "sslmode=verify-full");

    const pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    // Test 1: Find workspace members
    console.log('\n=== Test 1: WorkspaceMember.findFirst ===');
    const member = await prisma.workspaceMember.findFirst({
      orderBy: { workspace: { createdAt: 'asc' } },
      select: { workspaceId: true, userId: true, role: true },
    });
    console.log('First member:', member);

    // Test 2: Find projects (same query as /api/projects)
    if (member) {
      console.log('\n=== Test 2: Project.findMany ===');
      const projects = await prisma.project.findMany({
        where: { workspaceId: member.workspaceId },
        include: { channels: true },
        orderBy: { createdAt: 'desc' },
      });
      console.log('Project count:', projects.length);
      projects.slice(0, 3).forEach(p => {
        console.log(`  ${p.alias || p.name} (${p.status}) - ${p.channels.length} channels`);
      });
    }

    console.log('\n✅ All tests passed! Database is working correctly.');
    await prisma.$disconnect();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ ERROR:', err.message);
    console.error('Stack:', err.stack?.slice(0, 500));
    process.exit(1);
  }
}

main();
