const { Client } = require('pg');
const DB_URL = 'postgresql://neondb_owner:npg_eczPU6T0lHOB@ep-long-unit-ape6kzxh-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require';
const client = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

client.connect().then(async () => {
  console.log('=== INTEGRATION COLUMNS ===');
  const cols = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'Integration'
  `);
  cols.rows.forEach(c => {
    console.log(`  ${c.column_name}: ${c.data_type}`);
  });
  await client.end();
}).catch(e => { console.error('ERROR:', e.message); process.exit(1); });
