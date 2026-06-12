const { Client } = require('pg');
const c = new Client({ connectionString: process.env.TEST_DB_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  await c.connect();
  const w = await c.query('select id, name, slug, "createdAt" from "Workspace" order by "createdAt"');
  console.log('Workspaces:', w.rowCount);
  w.rows.forEach(r => console.log(' -', r.name, '(' + r.slug + ')', r.createdAt.toISOString()));
  const m = await c.query('select w.name, count(m.*)::int members from "Workspace" w left join "WorkspaceMember" m on m."workspaceId" = w.id group by w.name');
  console.log('Miembros:', JSON.stringify(m.rows));
  const u = await c.query('select count(*)::int n from "User"');
  console.log('Users:', u.rows[0].n);
  const statuses = await c.query('select status, count(*)::int n from "WorkspaceMember" group by status');
  console.log('Status de miembros:', JSON.stringify(statuses.rows));
  await c.end();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
