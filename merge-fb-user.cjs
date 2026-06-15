const { Client } = require('pg');
const DB_URL = 'postgresql://neondb_owner:npg_eczPU6T0lHOB@ep-long-unit-ape6kzxh-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require';
const client = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

client.connect().then(async () => {
  try {
    await client.query('BEGIN');

    const MAIN_USER_ID = 'cmprl6sgn000004jvjlu8bm9s';
    const DUP_USER_ID = '758431820460507';
    const FB_ACCOUNT_ID = 'acc_fb_758431820460507';

    console.log(`Linking Facebook Account ${FB_ACCOUNT_ID} to main user ${MAIN_USER_ID}...`);
    await client.query(`
      UPDATE "Account"
      SET "userId" = $1
      WHERE id = $2
    `, [MAIN_USER_ID, FB_ACCOUNT_ID]);

    console.log(`Deleting WorkspaceMember records for duplicate user ${DUP_USER_ID}...`);
    await client.query(`
      DELETE FROM "WorkspaceMember"
      WHERE "userId" = $1
    `, [DUP_USER_ID]);

    console.log(`Deleting duplicate user ${DUP_USER_ID}...`);
    await client.query(`
      DELETE FROM "User"
      WHERE id = $1
    `, [DUP_USER_ID]);

    await client.query('COMMIT');
    console.log('✅ Successfully merged Facebook login into main account and removed duplicate.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error during merge:', err.message);
  } finally {
    await client.end();
  }
}).catch(e => { console.error('ERROR:', e.message); process.exit(1); });
