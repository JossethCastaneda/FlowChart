require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || process.env.STORAGE_DATABASE_URL;
if (!connectionString) { console.error('No DATABASE_URL found in .env.local'); process.exit(1); }

const host = (() => { try { return new URL(connectionString).host; } catch { return '?'; } })();
console.log('[db-check] Connecting to:', host, '\n');

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Users with their workspace memberships
  const users = await prisma.user.findMany({
    select: {
      id: true, email: true, name: true,
      workspaces: {
        select: {
          role: true,
          workspace: { select: { id: true, name: true } }
        }
      }
    }
  });
  
  console.log('=== Users + Workspace Memberships ===');
  for (const u of users) {
    console.log(`\nUser: ${u.name} (${u.email || 'no email'}) [${u.id}]`);
    if (u.workspaces.length === 0) {
      console.log('  ⚠️  NO WORKSPACE MEMBERSHIP — This user cannot see any projects!');
    }
    for (const m of u.workspaces) {
      console.log(`  → Workspace: "${m.workspace.name}" [${m.workspace.id}] role=${m.role}`);
    }
  }
  
  // Check accounts (OAuth providers)
  const accounts = await prisma.account.findMany({
    select: { userId: true, provider: true, providerAccountId: true }
  });
  console.log('\n\n=== OAuth Accounts ===');
  for (const a of accounts) {
    const user = users.find(u => u.id === a.userId);
    console.log(`Account: provider=${a.provider} providerAccountId=${a.providerAccountId} → userId=${a.userId} (${user?.email || user?.name || '?'})`);
  }
}

main()
  .catch(e => { console.error('\nDB ERROR:', e.message); process.exit(1); })
  .finally(async () => { await pool.end(); });
