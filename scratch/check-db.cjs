require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');

const cs = process.env.DATABASE_URL;
console.log('DB host:', new URL(cs).host);

const p = new Pool({
  connectionString: cs,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

async function main() {
  try {
    // List tables
    const tables = await p.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY 1"
    );
    console.log('\n=== TABLES ===');
    console.log(tables.rows.map(x => x.table_name).join(', '));

    // Check Project columns
    const projCols = await p.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='Project' AND table_schema='public' ORDER BY ordinal_position"
    );
    console.log('\n=== Project columns ===');
    projCols.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));

    // Check Channel columns
    const chCols = await p.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='Channel' AND table_schema='public' ORDER BY ordinal_position"
    );
    console.log('\n=== Channel columns ===');
    chCols.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));

    // Check WorkspaceMember columns
    const wmCols = await p.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='WorkspaceMember' AND table_schema='public' ORDER BY ordinal_position"
    );
    console.log('\n=== WorkspaceMember columns ===');
    wmCols.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));

    // Count projects
    const count = await p.query("SELECT COUNT(*) as n FROM \"Project\"");
    console.log('\n=== Project count:', count.rows[0].n);

    // Count workspaces
    const wsCount = await p.query("SELECT COUNT(*) as n FROM \"Workspace\"");
    console.log('=== Workspace count:', wsCount.rows[0].n);

    // Count users
    const uCount = await p.query("SELECT COUNT(*) as n FROM \"User\"");
    console.log('=== User count:', uCount.rows[0].n);

    // Test the exact query Prisma would run for projects
    const projTest = await p.query('SELECT p.id, p.name, p.alias, p.status FROM "Project" p LIMIT 5');
    console.log('\n=== Sample projects ===');
    projTest.rows.forEach(r => console.log(`  ${r.id}: ${r.alias || r.name} (${r.status})`));

  } catch (err) {
    console.error('ERROR:', err.message);
    console.error('Stack:', err.stack?.slice(0, 500));
  } finally {
    await p.end();
  }
}

main();
