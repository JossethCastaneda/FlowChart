const { Client } = require('pg');
const c = new Client({ connectionString: process.env.TEST_DB_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  await c.connect();
  const r = await c.query(`select column_name from information_schema.columns where table_name = 'WorkspaceMember' order by ordinal_position`);
  console.log('Columnas WorkspaceMember:', r.rows.map(x => x.column_name).join(', '));
  const m = await c.query(`select u.email, m.role, m."activityStatus" from "WorkspaceMember" m join "User" u on u.id = m."userId" order by m.role`);
  console.log('Miembros:');
  m.rows.forEach(x => console.log(' -', x.email, x.role, x.activityStatus));
  await c.end();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
