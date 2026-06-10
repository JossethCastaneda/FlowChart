const { Client } = require('pg');

const client1 = new Client({ connectionString: 'postgresql://neondb_owner:npg_ND2Y8sQTridU@ep-jolly-surf-aqo6s6l7.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require' });
const client2 = new Client({ connectionString: 'postgresql://neondb_owner:npg_eczPU6T0lHOB@ep-long-unit-ape6kzxh.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require' });

async function run() {
  await client1.connect();
  const res1 = await client1.query(`SELECT count(*) FROM "Project"`);
  console.log("Local DB (Jolly-Surf) projects count:", res1.rows[0].count);
  await client1.end();

  await client2.connect();
  const res2 = await client2.query(`SELECT count(*) FROM "Project"`);
  console.log("Prod DB (Long-Unit) projects count:", res2.rows[0].count);
  await client2.end();
}

run().catch(console.error);
