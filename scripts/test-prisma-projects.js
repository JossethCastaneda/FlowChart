// Full Prisma simulation — runs same queries as GET /api/projects
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_eczPU6T0lHOB@ep-long-unit-ape6kzxh-pooler.c-7.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 2,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
});

const adapter = new PrismaPg(pool, { schema: 'public' });
const prisma = new PrismaClient({ adapter });

// jtrejo's userId
const userId = 'cmprl6sgn000004jvjlu8bm9s';
// LID MARKETING workspace
const workspaceId = 'cmprfigpy000004l7ssqkjwtb';

async function main() {
  try {
    console.log('1. Testing workspaceMember.findFirst (getActiveWorkspaceId fallback)...');
    const firstMembership = await prisma.workspaceMember.findFirst({
      where: { userId },
      orderBy: { workspace: { createdAt: 'asc' } },
      select: { workspaceId: true },
    });
    console.log('   Result:', firstMembership);

    console.log('\n2. Testing workspaceMember.findUnique (membership check)...');
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId },
      },
    });
    console.log('   Found:', membership ? `YES (role=${membership.role})` : 'NO');

    console.log('\n3. Testing project.findMany (the actual query)...');
    const projects = await prisma.project.findMany({
      where: { workspaceId },
      include: { channels: true },
      orderBy: { createdAt: 'desc' },
    });
    console.log('   Projects found:', projects.length);
    projects.forEach(p => console.log(`   - ${p.name} (${p.status})`));

    console.log('\n✅ All queries succeeded. API should work correctly.');
  } catch (err) {
    console.error('\n❌ ERROR:', err.message);
    console.error('Stack:', err.stack);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
