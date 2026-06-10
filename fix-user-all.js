const { Client } = require('pg');
const crypto = require('crypto');

const client1 = new Client({ connectionString: 'postgresql://neondb_owner:npg_ND2Y8sQTridU@ep-jolly-surf-aqo6s6l7.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require' });
const client2 = new Client({ connectionString: 'postgresql://neondb_owner:npg_eczPU6T0lHOB@ep-long-unit-ape6kzxh.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require' });

function genId() {
  return 'c' + crypto.randomBytes(12).toString('hex');
}

async function fix(client) {
  await client.connect();
  
  const user1 = await client.query('SELECT id, name FROM "User" WHERE email = \'jcastaneda@lidmarketing.com\'');
  const user2 = await client.query('SELECT id, name FROM "User" WHERE email = \'jtrejo.lid.mkt@gmail.com\'');
  
  const idsToAdd = [];
  if (user1.rows.length > 0) idsToAdd.push(user1.rows[0].id);
  if (user2.rows.length > 0) idsToAdd.push(user2.rows[0].id);
  
  const workspaces = await client.query('SELECT "workspaceId" FROM "WorkspaceMember" WHERE "userId" = \'758431820460507\' AND role = \'OWNER\'');
  
  for (const row of workspaces.rows) {
    const wsId = row.workspaceId;
    
    for (const newUserId of idsToAdd) {
      const check = await client.query('SELECT * FROM "WorkspaceMember" WHERE "workspaceId" = $1 AND "userId" = $2', [wsId, newUserId]);
      
      if (check.rows.length === 0) {
        await client.query('INSERT INTO "WorkspaceMember" (id, "workspaceId", "userId", role) VALUES ($1, $2, $3, \'OWNER\')', [genId(), wsId, newUserId]);
        console.log(`Added ${newUserId} as OWNER to workspace ${wsId}`);
      } else {
        await client.query('UPDATE "WorkspaceMember" SET role = \'OWNER\' WHERE "workspaceId" = $1 AND "userId" = $2', [wsId, newUserId]);
        console.log(`Updated ${newUserId} to OWNER in workspace ${wsId}`);
      }
    }
  }
  
  await client.end();
}

async function run() {
  console.log("Fixing local db...");
  await fix(client1);
  console.log("Fixing vercel db...");
  await fix(client2);
  console.log("Done!");
}

run().catch(console.error);
