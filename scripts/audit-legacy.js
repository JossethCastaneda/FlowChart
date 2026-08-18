require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.RECOVERY_DB_URL });
  await client.connect();
  
  const { rows } = await client.query(`SELECT id, "estimatedCostUsd" FROM "AiUsage" ORDER BY id`);
  for (const row of rows) {
    console.log(`ROW ID: ${row.id} - estimatedCostUsd: ${row.estimatedCostUsd === null ? 'NULL' : 'NON_NULL'}`);
  }

  await client.end();
}

main().catch(console.error);
