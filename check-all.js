const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://neondb_owner:npg_eczPU6T0lHOB@ep-long-unit-ape6kzxh-pooler.c-7.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require' });

async function check() {
  await client.connect();
  const res = await client.query('SELECT count(*) as count, "workspaceId" FROM "Project" GROUP BY "workspaceId"');
  console.log("Projects per workspace:", res.rows);
  
  const res2 = await client.query('SELECT id, name, "workspaceId" FROM "Project"');
  console.log("Projects:", res2.rows);

  await client.end();
}
check().catch(console.error);
