const { Client } = require('pg');

async function sync() {
  const prod = new Client({ connectionString: "postgresql://neondb_owner:npg_ND2Y8sQTridU@ep-jolly-surf-aqo6s6l7.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require" });
  const dev = new Client({ connectionString: "postgresql://neondb_owner:npg_eczPU6T0lHOB@ep-long-unit-ape6kzxh.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require" });

  await prod.connect();
  await dev.connect();

  console.log("Connected to both databases.");

  const tables = [
    '"User"',
    '"Account"',
    '"Session"',
    '"Workspace"',
    '"WorkspaceMember"',
    '"Project"',
    '"Task"',
    '"Client"',
    '"Brief"',
    '"ScheduledPost"',
    '"Lead"',
    '"Integration"'
  ];

  for (const table of tables) {
    try {
      console.log(`Syncing ${table}...`);
      const { rows } = await prod.query(`SELECT * FROM ${table}`);
      if (rows.length === 0) {
        console.log(`No data in ${table}`);
        continue;
      }

      // clear dev table
      await dev.query(`DELETE FROM ${table}`);

      const cols = Object.keys(rows[0]).map(k => `"${k}"`).join(', ');
      
      for (const row of rows) {
        const vals = Object.values(row);
        const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
        const query = `INSERT INTO ${table} (${cols}) VALUES (${placeholders})`;
        await dev.query(query, vals);
      }
      console.log(`Inserted ${rows.length} rows into ${table}`);
    } catch (e) {
      console.error(`Failed on ${table}:`, e.message);
    }
  }

  await prod.end();
  await dev.end();
}

sync().catch(console.error);
