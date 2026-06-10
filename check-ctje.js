const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://neondb_owner:npg_eczPU6T0lHOB@ep-long-unit-ape6kzxh-pooler.c-7.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require' });

async function check() {
  await client.connect();
  const res = await client.query('SELECT * FROM "WorkspaceMember" WHERE "userId" = \'758431820460507\'');
  console.log("Workspaces for CT JE:", res.rows);
  await client.end();
}
check().catch(console.error);
