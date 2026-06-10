const { Client } = require('pg');

async function main() {
  const connectionString = "postgresql://neondb_owner:npg_ND2Y8sQTridU@ep-jolly-surf-aqo6s6l7.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require";
  const client = new Client({ connectionString });
  await client.connect();

  console.log("Checking CT JE in ep-jolly-surf...");
  
  const user = await client.query('SELECT * FROM "User" WHERE id = $1', ['758431820460507']);
  console.log("CT JE User:", user.rows[0]);

  if (user.rows.length > 0) {
    const memberships = await client.query('SELECT * FROM "WorkspaceMember" WHERE "userId" = $1', ['758431820460507']);
    console.log("CT JE Memberships:", memberships.rows);
    
    if (memberships.rows.length > 0) {
      const workspaceId = memberships.rows[0].workspaceId;
      const projects = await client.query('SELECT * FROM "Project" WHERE "workspaceId" = $1', [workspaceId]);
      console.log(`Projects for workspace ${workspaceId}:`, projects.rowCount);
    }
  }

  await client.end();
}

main().catch(console.error);
