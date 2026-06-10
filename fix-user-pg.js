const { Client } = require('pg');
const crypto = require('crypto');

const connectionString = "postgresql://neondb_owner:npg_eczPU6T0lHOB@ep-long-unit-ape6kzxh-pooler.c-7.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require";

async function fix() {
  const client = new Client({ connectionString });
  await client.connect();

  const email = 'jcastaneda@lidmarketing.com';
  const workspaceId = 'cmprfigpy000004l7ssqkjwtb';

  try {
    // 1. Find or create user
    let res = await client.query('SELECT id FROM "User" WHERE email = $1', [email]);
    let userId;
    if (res.rows.length === 0) {
      userId = crypto.randomUUID();
      await client.query(
        'INSERT INTO "User" (id, email, name) VALUES ($1, $2, $3)',
        [userId, email, 'Josseth Castañeda']
      );
      console.log(`Created new User record for ${email}`);
    } else {
      userId = res.rows[0].id;
      console.log(`Found existing User record for ${email}: ${userId}`);
    }

    // 2. Check if user is in workspace
    res = await client.query(
      'SELECT id FROM "WorkspaceMember" WHERE "workspaceId" = $1 AND "userId" = $2',
      [workspaceId, userId]
    );

    if (res.rows.length === 0) {
      // Insert with correct columns matching the Prisma schema for WorkspaceMember
      const memberId = crypto.randomUUID();
      await client.query(
        `INSERT INTO "WorkspaceMember" 
         (id, "workspaceId", "userId", role, "activityStatus", "lastActiveAt") 
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [memberId, workspaceId, userId, 'OWNER', 'disponible']
      );
      console.log(`Successfully added user to workspace ${workspaceId}`);
    } else {
      console.log(`User is already a member of workspace ${workspaceId}`);
    }

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.end();
  }
}

fix();
