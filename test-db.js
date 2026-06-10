const { Client } = require('pg');

const client1 = new Client({ connectionString: 'postgresql://neondb_owner:npg_ND2Y8sQTridU@ep-jolly-surf-aqo6s6l7.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require' });
const client2 = new Client({ connectionString: 'postgresql://neondb_owner:npg_eczPU6T0lHOB@ep-long-unit-ape6kzxh.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require' });

async function check() {
  await client1.connect();
  const ws1 = await client1.query('SELECT id, name FROM "Workspace"');
  console.log("Jolly-Surf Workspaces:", ws1.rows);
  const proj1 = await client1.query('SELECT id, name, "workspaceId" FROM "Project"');
  console.log("Jolly-Surf Projects with WS:", proj1.rows);
  await client1.end();

  await client2.connect();
  const ws2 = await client2.query('SELECT id, name FROM "Workspace"');
  console.log("Long-Unit Workspaces:", ws2.rows);
  const proj2 = await client2.query('SELECT id, name, "workspaceId" FROM "Project"');
  console.log("Long-Unit Projects with WS:", proj2.rows);
  await client2.end();
}

check().catch(console.error);
