const { Client } = require('pg');

const client2 = new Client({ connectionString: 'postgresql://neondb_owner:npg_eczPU6T0lHOB@ep-long-unit-ape6kzxh.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require' });

async function run() {
  await client2.connect();
  const res = await client2.query(`SELECT id, name, "workspaceId" FROM "Project" LIMIT 5`);
  console.log(res.rows);
  await client2.end();
}

run().catch(console.error);
