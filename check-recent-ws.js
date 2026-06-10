const { Client } = require('pg');
const client2 = new Client({ connectionString: 'postgresql://neondb_owner:npg_eczPU6T0lHOB@ep-long-unit-ape6kzxh.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require' });

async function run() {
  await client2.connect();
  const res = await client2.query(`
    SELECT w.id, w.name, w."createdAt", wm."userId", u.email 
    FROM "Workspace" w
    JOIN "WorkspaceMember" wm ON w.id = wm."workspaceId"
    JOIN "User" u ON wm."userId" = u.id
    ORDER BY w."createdAt" DESC
    LIMIT 10
  `);
  console.log("Recent workspaces in VERCEL:");
  console.table(res.rows);
  await client2.end();
}
run().catch(console.error);
