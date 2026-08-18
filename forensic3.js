require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  console.log('\n--- TIMESTAMPS ---');
  const tables = ['Workspace', 'User', 'AiRequest'];
  for (const t of tables) {
    try {
      const res = await client.query(`SELECT MIN("createdAt") as min_c, MAX("createdAt") as max_c FROM "${t}"`);
      console.log(`${t}: MIN ${res.rows[0].min_c} | MAX ${res.rows[0].max_c}`);
    } catch(e) {
      console.log(`${t}: ERROR ${e.message}`);
    }
  }

  await client.end();
}

main().catch(console.error);
