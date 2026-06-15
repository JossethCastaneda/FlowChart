const { Client } = require('pg');
const DB_URL = 'postgresql://neondb_owner:npg_eczPU6T0lHOB@ep-long-unit-ape6kzxh-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require';
const client = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

client.connect().then(async () => {
  console.log('=== Querying Lid Marketing Workspace ===');
  
  const workspaces = await client.query(`
    SELECT * FROM "Workspace"
    WHERE name ILIKE '%Lid Marketing%' OR slug ILIKE '%lid%'
  `);
  
  console.log('\nWORKSPACES:');
  console.table(workspaces.rows);

  if (workspaces.rows.length > 0) {
    const wsId = workspaces.rows[0].id;
    const members = await client.query(`
      SELECT wm.id, wm."workspaceId", wm."userId", wm.role, u.name, u.email, u.id as u_id
      FROM "WorkspaceMember" wm
      JOIN "User" u ON wm."userId" = u.id
      WHERE wm."workspaceId" = $1
    `, [wsId]);
    
    console.log('\nMEMBERS OF', workspaces.rows[0].name, ':');
    console.table(members.rows);
  }

  console.log('\n=== Querying all Facebook accounts ===');
  const fbAccounts = await client.query(`
    SELECT a.id, a."userId", a."providerAccountId", u.name, u.email, u.id as u_id
    FROM "Account" a
    JOIN "User" u ON a."userId" = u.id
    WHERE a.provider = 'facebook' OR a.provider = 'facebook-sdk'
  `);
  console.log('\nFACEBOOK ACCOUNTS:');
  console.table(fbAccounts.rows);

  await client.end();
}).catch(e => { console.error('ERROR:', e.message); process.exit(1); });
