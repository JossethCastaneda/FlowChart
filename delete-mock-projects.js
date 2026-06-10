const { Client } = require('pg');

async function main() {
  console.log("Deleting all mock projects in production...");
  const client = new Client({
    connectionString: "postgresql://neondb_owner:npg_ND2Y8sQTridU@ep-jolly-surf-aqo6s6l7.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require"
  });

  await client.connect();

  try {
    const res = await client.query('DELETE FROM "Project" RETURNING id');
    console.log(`Successfully deleted ${res.rowCount} projects.`);
  } catch (err) {
    console.error("Error deleting projects:", err);
  } finally {
    await client.end();
  }
}

main();
