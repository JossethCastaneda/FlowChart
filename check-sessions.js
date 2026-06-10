const { Client } = require('pg');

const client1 = new Client({ connectionString: 'postgresql://neondb_owner:npg_ND2Y8sQTridU@ep-jolly-surf-aqo6s6l7.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require' });
const client2 = new Client({ connectionString: 'postgresql://neondb_owner:npg_eczPU6T0lHOB@ep-long-unit-ape6kzxh.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require' });

async function checkSessions(client, name) {
  await client.connect();
  const sessions = await client.query(`
    SELECT s."userId", s.expires, u.name, u.email 
    FROM "Session" s 
    JOIN "User" u ON s."userId" = u.id
    WHERE s.expires > NOW()
  `);
  console.log(`--- ${name} Active Sessions ---`);
  console.log(sessions.rows);
  
  const workspaces = await client.query(`
    SELECT w.name as ws_name, u.name as user_name, u.email, wm.role 
    FROM "WorkspaceMember" wm
    JOIN "User" u ON wm."userId" = u.id
    JOIN "Workspace" w ON wm."workspaceId" = w.id
  `);
  console.log(`--- ${name} Workspace Members ---`);
  console.log(workspaces.rows);
  
  await client.end();
}

async function run() {
  await checkSessions(client1, "Jolly-Surf (Local)");
  await checkSessions(client2, "Long-Unit (Vercel)");
}

run().catch(console.error);
