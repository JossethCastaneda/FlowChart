const { Client } = require('pg');

const client1 = new Client({ connectionString: 'postgresql://neondb_owner:npg_ND2Y8sQTridU@ep-jolly-surf-aqo6s6l7.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require' });

async function check() {
  await client1.connect();
  const accounts = await client1.query('SELECT "userId", provider FROM "Account"');
  console.log("Accounts:", accounts.rows);
  await client1.end();
}

check().catch(console.error);
