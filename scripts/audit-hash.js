require('dotenv').config();
const { Client } = require('pg');
const crypto = require('crypto');

async function main() {
  const client = new Client({ connectionString: process.env.RECOVERY_DB_URL });
  await client.connect();
  
  const { rows } = await client.query(`SELECT id, "estimatedCostUsd" FROM "AiUsage" ORDER BY id`);
  for (const row of rows) {
    const canonicalStr = JSON.stringify({ id: row.id, estimatedCostUsd: row.estimatedCostUsd });
    const hash = crypto.createHash('sha256').update(canonicalStr).digest('hex');
    console.log(`ID: ${row.id} - SHA256: ${hash}`);
  }

  await client.end();
}

main().catch(console.error);
