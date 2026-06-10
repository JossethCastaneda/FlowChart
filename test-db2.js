const { Client } = require('pg');

const client1 = new Client({ connectionString: 'postgresql://neondb_owner:npg_ND2Y8sQTridU@ep-jolly-surf-aqo6s6l7.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require' });

async function check() {
  await client1.connect();
  const users = await client1.query('SELECT id, name, email FROM "User"');
  console.log("Users:", users.rows);
  const members = await client1.query('SELECT "workspaceId", "userId", role FROM "WorkspaceMember"');
  console.log("WorkspaceMembers:", members.rows);
  await client1.end();
}

check().catch(console.error);
