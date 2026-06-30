import { Pool } from 'pg';
import fs from 'fs';

// Read URL manually
const envContent = fs.readFileSync('.env.local', 'utf8');
const dbUrlLine = envContent.split('\n').find(l => l.startsWith('STORAGE_POSTGRES_PRISMA_URL='));
const dbUrl = dbUrlLine ? dbUrlLine.split('=')[1].replace(/"/g, '').trim() : '';

console.log('Connecting to DB...');
const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function mergeDuplicateUsers() {
  console.log('Fetching all users...');
  
  const { rows: users } = await pool.query('SELECT id, email FROM "User"');

  const emailGroups: Record<string, any[]> = {};
  for (const user of users) {
    if (!user.email) continue;
    const lowerEmail = user.email.toLowerCase();
    if (!emailGroups[lowerEmail]) {
      emailGroups[lowerEmail] = [];
    }
    emailGroups[lowerEmail].push(user);
  }

  const duplicates = Object.entries(emailGroups).filter(([_, group]) => group.length > 1);

  if (duplicates.length === 0) {
    console.log('No duplicate users found.');
    return;
  }

  console.log(`Found ${duplicates.length} emails with duplicate accounts.`);

  for (const [email, group] of duplicates) {
    console.log(`\nProcessing duplicates for email: ${email}`);
    
    const userIds = group.map(u => `'${u.id}'`).join(',');
    
    // Count workspaces
    const { rows: workspaces } = await pool.query(`SELECT "userId", count(*) as c FROM "WorkspaceMember" WHERE "userId" IN (${userIds}) GROUP BY "userId"`);
    
    // Map workspace counts
    const counts = {};
    for (const row of workspaces) counts[row.userId] = parseInt(row.c, 10);
    
    group.forEach(u => u.workspaceCount = counts[u.id] || 0);
    
    const usersWithWorkspaces = group.filter(u => u.workspaceCount > 0);
    const usersWithoutWorkspaces = group.filter(u => u.workspaceCount === 0);

    let primaryUser;
    let secondaryUsers = [];

    if (usersWithWorkspaces.length > 0) {
      primaryUser = usersWithWorkspaces[0];
      secondaryUsers = [...usersWithWorkspaces.slice(1), ...usersWithoutWorkspaces];
    } else {
      const sorted = [...group].sort((a, b) => a.id.localeCompare(b.id));
      primaryUser = sorted[0];
      secondaryUsers = sorted.slice(1);
    }

    console.log(`Primary user: ${primaryUser.id} (${primaryUser.email}, workspaces: ${primaryUser.workspaceCount})`);

    for (const secUser of secondaryUsers) {
      console.log(`  Merging secondary user: ${secUser.id} (${secUser.email})`);

      // 1. Move Accounts
      await pool.query(`UPDATE "Account" SET "userId" = $1 WHERE "userId" = $2 ON CONFLICT DO NOTHING`, [primaryUser.id, secUser.id]);
      await pool.query(`DELETE FROM "Account" WHERE "userId" = $1`, [secUser.id]);

      // 2. Move WorkspaceMembers
      await pool.query(`UPDATE "WorkspaceMember" SET "userId" = $1 WHERE "userId" = $2 ON CONFLICT DO NOTHING`, [primaryUser.id, secUser.id]);
      await pool.query(`DELETE FROM "WorkspaceMember" WHERE "userId" = $1`, [secUser.id]);

      // 3. Move ProjectMembers
      await pool.query(`UPDATE "ProjectMember" SET "userId" = $1 WHERE "userId" = $2 ON CONFLICT DO NOTHING`, [primaryUser.id, secUser.id]);
      await pool.query(`DELETE FROM "ProjectMember" WHERE "userId" = $1`, [secUser.id]);

      // Delete user
      await pool.query(`DELETE FROM "User" WHERE id = $1`, [secUser.id]);
      console.log(`    Merged and deleted ${secUser.id}.`);
    }

    // Ensure lowercase email
    if (primaryUser.email !== email) {
      console.log(`  Updating primary user email to lowercase: ${email}`);
      await pool.query(`UPDATE "User" SET email = $1 WHERE id = $2`, [email, primaryUser.id]);
    }
  }

  console.log('\nMerge complete.');
}

mergeDuplicateUsers()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
