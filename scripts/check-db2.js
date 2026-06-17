// Check workspace/member/project relationship
const { Client } = require('pg');
const url = 'postgresql://neondb_owner:npg_eczPU6T0lHOB@ep-long-unit-ape6kzxh.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();

  // Workspaces and project counts
  const ws = await c.query(`
    SELECT w.id, w.name, 
      COUNT(DISTINCT wm.id) as members, 
      COUNT(DISTINCT p.id) as projects
    FROM "Workspace" w
    LEFT JOIN "WorkspaceMember" wm ON wm."workspaceId" = w.id
    LEFT JOIN "Project" p ON p."workspaceId" = w.id
    GROUP BY w.id, w.name
    ORDER BY w.name
  `);
  console.log('\n=== WORKSPACES ===');
  ws.rows.forEach(r => console.log(`  [${r.name}] id=${r.id} members=${r.members} projects=${r.projects}`));

  // Users and memberships
  const users = await c.query(`
    SELECT u.id, u.email, u.name, COUNT(wm.id) as ws_count
    FROM "User" u
    LEFT JOIN "WorkspaceMember" wm ON wm."userId" = u.id
    GROUP BY u.id, u.email, u.name
    ORDER BY u.email
  `);
  console.log('\n=== USERS ===');
  users.rows.forEach(r => console.log(`  [${r.email}] id=${r.id} workspaces=${r.ws_count}`));

  // Orphan projects (no workspace member)
  const orphan = await c.query(`
    SELECT p.id, p.name, p."workspaceId",
      (SELECT COUNT(*) FROM "WorkspaceMember" wm WHERE wm."workspaceId" = p."workspaceId") as ws_members
    FROM "Project" p
    ORDER BY p."workspaceId"
  `);
  console.log('\n=== PROJECTS with workspace member counts ===');
  orphan.rows.forEach(r => console.log(`  [${r.name}] ws=${r.workspaceid} members=${r.ws_members}`));

  await c.end();
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
