import 'dotenv/config';
import pg from 'pg';

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

async function main() {
  await client.connect();
  console.log("Connected. Truncating MetaAnalyticsCache...");
  await client.query('TRUNCATE TABLE "MetaAnalyticsCache" CASCADE;');
  console.log("Truncated.");
  
  const res = await client.query(`
    SELECT relname as table_name,
           pg_size_pretty(pg_total_relation_size(relid)) As size,
           pg_total_relation_size(relid) as raw_size
    FROM pg_catalog.pg_statio_user_tables
    ORDER BY pg_total_relation_size(relid) DESC
    LIMIT 5;
  `);
  console.table(res.rows);
}

main()
  .catch(console.error)
  .finally(() => client.end());
