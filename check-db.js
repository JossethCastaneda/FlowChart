require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  const tables = ['Workspace', 'User', 'AiUsage', 'Project'];
  
  for (const t of tables) {
    try {
      const res = await client.query(`SELECT COUNT(*) FROM "${t}"`);
      console.log(`${t} rows:`, res.rows[0].count);
    } catch (e) {
      console.log(`${t} rows: table missing`);
    }
  }

  await client.end();
}

main().catch(console.error);
