require('dotenv').config();
const { Client } = require('pg');
const { execSync } = require('child_process');

async function main() {
  console.log('--- STEP 1 ---');
  const url = new URL(process.env.DATABASE_URL);
  console.log('DB Host:', url.hostname);
  console.log('DB Name:', url.pathname);
  
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  const version = await client.query('SELECT version()');
  console.log('Version:', version.rows[0].version.substring(0, 30));
  
  const w = await client.query('SELECT COUNT(*) FROM "Workspace"');
  console.log('Workspace count:', w.rows[0].count);
  
  const a = await client.query('SELECT COUNT(*) FROM "AiUsage"');
  console.log('AiUsage count:', a.rows[0].count);
  
  const col = await client.query(`SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'AiUsage' AND column_name = 'estimatedCostUsd') as exists`);
  console.log('estimatedCostUsd exists:', col.rows[0].exists);
  
  const mig = await client.query(`SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = '_prisma_migrations') as exists`);
  console.log('_prisma_migrations exists:', mig.rows[0].exists);
  
  await client.end();

  console.log('\n--- STEP 2 ---');
  try {
    const neonVersion = execSync('neon version', { encoding: 'utf-8' });
    console.log('Neon CLI found:', neonVersion.trim());
  } catch(e) {
    console.log('Neon CLI not found or errored.');
  }
  
  if (process.env.NEON_API_KEY) {
    console.log('NEON_API_KEY environment variable is present.');
  } else {
    console.log('NEON_API_KEY environment variable is NOT present.');
  }
}

main().catch(console.error);
