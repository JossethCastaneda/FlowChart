const { Client } = require('pg');
const crypto = require('crypto');

const client = new Client({ connectionString: 'postgresql://neondb_owner:npg_ND2Y8sQTridU@ep-jolly-surf-aqo6s6l7.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require' });

function genId() {
  return 'c' + crypto.randomBytes(12).toString('hex');
}

async function fix() {
  await client.connect();
  
  const user = await client.query('SELECT id, name FROM "User" WHERE email = \'jcastaneda@lidmarketing.com\'');
  if (user.rows.length === 0) {
    console.log("Could not find the new user");
    return;
  }
  const newUserId = user.rows[0].id;
  
  const workspaces = await client.query('SELECT "workspaceId" FROM "WorkspaceMember" WHERE "userId" = \'758431820460507\' AND role = \'OWNER\'');
  
  for (const row of workspaces.rows) {
    const wsId = row.workspaceId;
    const check = await client.query('SELECT * FROM "WorkspaceMember" WHERE "workspaceId" = $1 AND "userId" = $2', [wsId, newUserId]);
    
    if (check.rows.length === 0) {
      await client.query('INSERT INTO "WorkspaceMember" (id, "workspaceId", "userId", role, "activityStatus", "lastActiveAt") VALUES ($1, $2, $3, \'OWNER\', \'disponible\', NOW())', [genId(), wsId, newUserId]);
      console.log(`Added ${newUserId} as OWNER to workspace ${wsId}`);
    } else {
      await client.query('UPDATE "WorkspaceMember" SET role = \'OWNER\' WHERE "workspaceId" = $1 AND "userId" = $2', [wsId, newUserId]);
      console.log(`Updated ${newUserId} to OWNER in workspace ${wsId}`);
    }
  }
  
  await client.end();
  console.log("Fix complete.");
}

fix().catch(console.error);
