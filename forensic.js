require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  console.log('DB Host:', url.hostname);
  console.log('DB Name:', url.pathname);
  
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  console.log('\n--- MIGRATION HISTORY ---');
  try {
    const migs = await client.query('SELECT migration_name, started_at, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY started_at DESC LIMIT 10');
    console.table(migs.rows);
  } catch(e) {
    console.log('_prisma_migrations error:', e.message);
  }

  console.log('\n--- AI USAGE COLUMNS ---');
  try {
    const cols = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'AiUsage'`);
    console.log(cols.rows.map(r => r.column_name).join(', '));
  } catch(e) {
    console.log('AiUsage columns error:', e.message);
  }

  console.log('\n--- ROW COUNTS ---');
  const tables = ['Workspace', 'User', 'WorkspaceMember', 'AiUsage', 'AiRequest', 'AiRun', 'BillingCustomer', 'Invoice'];
  for (const t of tables) {
    try {
      const res = await client.query(`SELECT COUNT(*) FROM "${t}"`);
      console.log(`${t}:`, res.rows[0].count);
    } catch(e) {
      console.log(`${t}: ERROR ${e.message}`);
    }
  }

  await client.end();
}

main().catch(console.error);
