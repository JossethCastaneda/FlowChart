// Quick diagnostic script — checks tables and columns in production DB
const { Client } = require('pg');

const url = 'postgresql://neondb_owner:npg_eczPU6T0lHOB@ep-long-unit-ape6kzxh.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();

  // 1. List all tables
  const tables = await client.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' ORDER BY table_name
  `);
  console.log('\n=== TABLES ===');
  tables.rows.forEach(r => console.log(' -', r.table_name));

  // 2. Check Project table columns
  const cols = await client.query(`
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Project'
    ORDER BY ordinal_position
  `);
  console.log('\n=== Project COLUMNS ===');
  cols.rows.forEach(r => console.log(` - ${r.column_name}: ${r.data_type}`));

  // 3. Check if botFlowType column exists
  const hasBotFlow = cols.rows.find(r => r.column_name === 'botFlowType');
  console.log('\n=== botFlowType exists:', hasBotFlow ? 'YES' : 'NO ← MISSING!');

  // 4. Count projects
  const count = await client.query('SELECT COUNT(*) FROM "Project"');
  console.log('=== Project count:', count.rows[0].count);

  // 5. Check WorkspaceMember table  
  const members = await client.query(`SELECT COUNT(*) FROM "WorkspaceMember"`);
  console.log('=== WorkspaceMember count:', members.rows[0].count);

  await client.end();
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
