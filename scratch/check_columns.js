const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  console.log("Database Host:", new URL(process.env.DATABASE_URL).host);

  // Check columns of Project
  const projRes = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'Project';
  `);
  console.log("Project columns:");
  projRes.rows.forEach(r => console.log(`  - ${r.column_name}: ${r.data_type}`));

  // Check columns of Integration
  const intRes = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'Integration';
  `);
  console.log("\nIntegration columns:");
  intRes.rows.forEach(r => console.log(`  - ${r.column_name}: ${r.data_type}`));

  await client.end();
}

main().catch(console.error);
