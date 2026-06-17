// Full diagnostic: user jtrejo, workspace LID MARKETING, projects
const { Client } = require('pg');
const url = 'postgresql://neondb_owner:npg_eczPU6T0lHOB@ep-long-unit-ape6kzxh.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function main() {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();

  // 1. User jtrejo's workspaces
  const jtrejo = await c.query(`
    SELECT u.id as uid, u.email, wm."workspaceId", wm.role, w.name as wsname
    FROM "User" u
    JOIN "WorkspaceMember" wm ON wm."userId" = u.id
    JOIN "Workspace" w ON w.id = wm."workspaceId"
    WHERE u.email = 'jtrejo.lid.mkt@gmail.com'
  `);
  console.log('\n=== jtrejo workspaces ===');
  jtrejo.rows.forEach(r => console.log(`  ws="${r.wsname}" id=${r.workspaceid} role=${r.role}`));

  // 2. LID MARKETING workspace details
  const lidws = await c.query(`SELECT * FROM "Workspace" WHERE name = 'LID MARKETING'`);
  console.log('\n=== LID MARKETING workspace ===');
  lidws.rows.forEach(r => console.log(`  id=${r.id} name=${r.name}`));

  const lidWsId = lidws.rows[0]?.id;
  if (lidWsId) {
    // 3. LID MARKETING members
    const members = await c.query(`
      SELECT wm."userId", wm.role, u.email 
      FROM "WorkspaceMember" wm 
      JOIN "User" u ON u.id = wm."userId"
      WHERE wm."workspaceId" = $1
    `, [lidWsId]);
    console.log('\n=== LID MARKETING members ===');
    members.rows.forEach(r => console.log(`  ${r.email} role=${r.role}`));

    // 4. LID MARKETING projects
    const projects = await c.query(`
      SELECT id, name, status FROM "Project" WHERE "workspaceId" = $1
    `, [lidWsId]);
    console.log('\n=== LID MARKETING projects ===');
    projects.rows.forEach(r => console.log(`  [${r.status}] ${r.name}`));
  }

  // 5. Check any workspace with projects that jtrejo is NOT a member of
  const mismatches = await c.query(`
    SELECT p."workspaceId", w.name as wsname, COUNT(*) as count
    FROM "Project" p
    JOIN "Workspace" w ON w.id = p."workspaceId"
    WHERE p."workspaceId" NOT IN (
      SELECT wm."workspaceId" FROM "WorkspaceMember" wm 
      WHERE wm."userId" = (SELECT id FROM "User" WHERE email = 'jtrejo.lid.mkt@gmail.com')
    )
    GROUP BY p."workspaceId", w.name
  `);
  console.log('\n=== Workspaces with projects where jtrejo is NOT a member ===');
  if (mismatches.rows.length === 0) {
    console.log('  None — jtrejo is a member of all workspaces with projects');
  } else {
    mismatches.rows.forEach(r => console.log(`  ws="${r.wsname}" id=${r.workspaceid} projects=${r.count}`));
  }

  await c.end();
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
