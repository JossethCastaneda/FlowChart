require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  const tables = ['WorkspaceAiBudgetBalance', 'BillingRecoveryPolicy', 'AiUsage', 'Subscription'];
  for (const table of tables) {
    console.log(`\n=== TABLE: ${table} ===`);
    const { rows } = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = $1
      ORDER BY ordinal_position
    `, [table]);
    for (const r of rows) {
      console.log(`  ${r.column_name} (${r.data_type}) NULL: ${r.is_nullable}`);
    }
  }

  const { rows: legacyRows } = await client.query(`SELECT id FROM "AiUsage"`);
  console.log('AiUsage row IDs in PROD: ', legacyRows.map(r => r.id).join(', '));
  
  await client.end();
}

main().catch(console.error);
