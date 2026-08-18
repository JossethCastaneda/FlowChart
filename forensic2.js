require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  console.log('\n--- MIGRATION HISTORY ---');
  try {
    const migs = await client.query('SELECT migration_name, started_at, finished_at, rolled_back_at FROM "_prisma_migrations" ORDER BY started_at DESC LIMIT 10');
    console.table(migs.rows);
  } catch(e) {
    console.log('_prisma_migrations error:', e.message);
  }

  console.log('\n--- ALL TABLES ---');
  try {
    const tables = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
    console.log(tables.rows.map(r => r.table_name).join(', '));
  } catch(e) {
    console.log(e.message);
  }

  await client.end();
}

main().catch(console.error);
