const { Client } = require('pg');

const client2 = new Client({ connectionString: 'postgresql://neondb_owner:npg_eczPU6T0lHOB@ep-long-unit-ape6kzxh.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require' });

async function run() {
  await client2.connect();
  const res = await client2.query(`
    SELECT wm."workspaceId", w.name, w."createdAt"
    FROM "WorkspaceMember" wm
    JOIN "Workspace" w ON wm."workspaceId" = w.id
    WHERE wm."userId" = 'cmpumug63000204iiwwjtcutz' OR wm."userId" = 'cmprl6sgn000004jvjlu8bm9s'
    ORDER BY w."createdAt" ASC
  `);
  console.log("Workspaces for user in VERCEL DB:", res.rows);
  await client2.end();
}

run().catch(console.error);
