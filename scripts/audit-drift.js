require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const prodUrl = process.env.DATABASE_URL;
  if (!prodUrl) throw new Error('Missing DATABASE_URL');

  const client = new Client({ connectionString: prodUrl });
  await client.connect();

  console.log('=== PHASE 2: DATABASE TARGET GUARD ===');
  const url = new URL(prodUrl);
  console.log(`Database name: ${url.pathname.substring(1)}`);
  console.log(`Host: ${url.hostname.replace('-pooler', '')}`);

  const { rows: versionRows } = await client.query('SELECT version()');
  console.log(`Server version: ${versionRows[0].version.substring(0, 50)}...`);

  const { rows: countRows } = await client.query('SELECT COUNT(*) as c FROM "AiUsage"');
  const count = parseInt(countRows[0].c, 10);
  console.log(`AiUsage count: ${count}`);

  const { rows: colRows } = await client.query(`
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'AiUsage' AND column_name = 'estimatedCostUsd') as e
  `);
  const hasEst = colRows[0].e;
  console.log(`estimatedCostUsd exists: ${hasEst}`);

  const { rows: migRows } = await client.query(`
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '_prisma_migrations') as e
  `);
  const hasMig = migRows[0].e;
  console.log(`_prisma_migrations exists: ${hasMig}`);

  if (count !== 2 || hasEst !== false) {
    console.error('DATABASE_TARGET_MISMATCH');
    process.exit(1);
  }

  console.log('\n=== PHASE 3: RAW MIGRATION METADATA ===');
  if (!hasMig) {
    console.log('MIGRATION_METADATA_STATE: ABSENT');
  } else {
    const { rows: migrations } = await client.query('SELECT * FROM "_prisma_migrations" ORDER BY started_at');
    for (const m of migrations) {
      console.log(`MIGRATION_IN_DB: ${m.migration_name} | ${m.checksum} | applied_steps_count=${m.applied_steps_count} | rolled_back_at=${m.rolled_back_at}`);
    }
  }

  await client.end();
}

main().catch(console.error);
