const { Client } = require('pg');

async function main() {
  const connectionString = "postgresql://neondb_owner:npg_ND2Y8sQTridU@ep-jolly-surf-aqo6s6l7.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require";
  const client = new Client({ connectionString });
  await client.connect();

  console.log("Connected to ep-jolly-surf (PRODUCTION)");
  
  const res1 = await client.query('SELECT count(*) FROM "User"');
  console.log("Users:", res1.rows[0].count);

  const res2 = await client.query('SELECT count(*) FROM "Project"');
  console.log("Projects:", res2.rows[0].count);

  const res3 = await client.query('SELECT count(*) FROM "Workspace"');
  console.log("Workspaces:", res3.rows[0].count);

  await client.end();
}

main().catch(console.error);
