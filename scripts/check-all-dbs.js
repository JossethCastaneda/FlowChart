// Check schema across all available Neon connections
require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const urls = {
  'STORAGE_DATABASE_URL': process.env.STORAGE_DATABASE_URL,
  'STORAGE_DATABASE_URL_UNPOOLED': process.env.STORAGE_DATABASE_URL_UNPOOLED,
  'STORAGE_POSTGRES_PRISMA_URL': process.env.STORAGE_POSTGRES_PRISMA_URL,
  'DATABASE_URL': process.env.DATABASE_URL,
  'DATABASE_URL_UNPOOLED': process.env.DATABASE_URL_UNPOOLED,
};

async function checkDB(name, url) {
  if (!url || url === '') {
    console.log(`${name}: (empty/missing)`);
    return;
  }
  try {
    const host = new URL(url).host;
    console.log(`\n${name}: ${host}`);
    const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
    await c.connect();
    
    // Check publicToken column
    const cols = await c.query(
      "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Project' ORDER BY ordinal_position"
    );
    console.log(`  Project columns (${cols.rows.length}):`, cols.rows.map(r => r.column_name).join(', '));
    console.log(`  Has publicToken: ${cols.rows.some(r => r.column_name === 'publicToken')}`);
    
    // Count projects
    const count = await c.query('SELECT COUNT(*) FROM "Project"');
    console.log(`  Project count: ${count.rows[0].count}`);
    
    await c.end();
  } catch (e) {
    console.log(`  ERROR: ${e.message}`);
  }
}

async function main() {
  for (const [name, url] of Object.entries(urls)) {
    await checkDB(name, url);
  }
}

main().catch(console.error);
