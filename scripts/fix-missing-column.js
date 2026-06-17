// Add missing publicToken column to production database
require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const url = process.env.STORAGE_DATABASE_URL_UNPOOLED 
  || process.env.STORAGE_DATABASE_URL;

if (!url) {
  console.error('No database URL found in .env.local');
  process.exit(1);
}

console.log('DB host:', new URL(url).host);

async function main() {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();

  // Check if column exists
  const check = await c.query(
    "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Project' AND column_name = 'publicToken'"
  );

  if (check.rows.length > 0) {
    console.log('Column publicToken already exists.');
  } else {
    console.log('Adding publicToken column...');
    await c.query('ALTER TABLE "Project" ADD COLUMN "publicToken" TEXT UNIQUE');
    console.log('Column publicToken added.');
  }

  // Now do a full db push to catch any other missing columns
  await c.end();
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
