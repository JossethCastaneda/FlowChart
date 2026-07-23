require('dotenv').config({path:'.env'});
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function go() {
  // Check all workspaces and their integrations
  const { rows } = await p.query(`
    SELECT w.id, w.name,
           (SELECT COUNT(*) FROM "Integration" i WHERE i."workspaceId" = w.id AND i.provider='facebook') as fb_count
    FROM "Workspace" w ORDER BY w.name
  `);
  console.log('Workspaces:');
  rows.forEach(r => console.log(`  ${r.name} | ${r.id.slice(0,12)} | fb integrations: ${r.fb_count}`));

  console.log('\nProjects+workspaces:');
  const { rows: projs } = await p.query(`
    SELECT p.alias, p."workspaceId", c.config->>'goal' as goal, c.config->'adAccounts' as accs
    FROM "Project" p
    JOIN "Channel" c ON c."projectId" = p.id
    WHERE c.config->>'platformId' = 'meta'
  `);
  projs.forEach(r => console.log(`  [${r.alias}] ws:${r.workspaceId?.slice(0,12)} goal:"${r.goal}" accs:${JSON.stringify(r.accs)}`));

  await p.end();
}
go().catch(e => { console.error(e.message); process.exit(1); });
