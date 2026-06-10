const { Client } = require('pg');

const client1 = new Client({ connectionString: 'postgresql://neondb_owner:npg_ND2Y8sQTridU@ep-jolly-surf-aqo6s6l7.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require' });

async function run() {
  await client1.connect();
  const res = await client1.query(`
    SELECT wm."workspaceId", w.name, w."createdAt"
    FROM "WorkspaceMember" wm
    JOIN "Workspace" w ON wm."workspaceId" = w.id
    WHERE wm."userId" = 'cmpumug63000204iiwwjtcutz'
    ORDER BY w."createdAt" ASC
  `);
  console.log("Workspaces for cmpumug63000204iiwwjtcutz:", res.rows);
  await client1.end();
}

run().catch(console.error);
