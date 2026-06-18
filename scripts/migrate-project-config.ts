import { Client } from 'pg';

const OLD_DB_URL = "postgresql://neondb_owner:npg_MaNWPb0sfpe1@ep-jolly-surf-aqo6s6l7-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require";
const NEW_DB_URL = "postgresql://neondb_owner:npg_eczPU6T0lHOB@ep-long-unit-ape6kzxh-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require";

async function main() {
  console.log("Connecting to old database...");
  const oldClient = new Client({ connectionString: OLD_DB_URL });
  await oldClient.connect();

  console.log("Connecting to new database...");
  const newClient = new Client({ connectionString: NEW_DB_URL });
  await newClient.connect();

  // Get workspace ID from new DB
  const wsRes = await newClient.query('SELECT id FROM "Workspace" LIMIT 1');
  if (wsRes.rows.length === 0) {
    throw new Error("No workspaces found in new DB");
  }
  const workspaceId = wsRes.rows[0].id;

  console.log("Fetching projects from old database...");
  const result = await oldClient.query('SELECT * FROM "Project"');
  const oldProjects = result.rows;
  console.log(`Found ${oldProjects.length} projects in old database.`);

  let updatedCount = 0;
  let insertedCount = 0;

  for (const oldP of oldProjects) {
    // Check if it exists in the new DB by NAME
    const newPRes = await newClient.query('SELECT id, name FROM "Project" WHERE name = $1', [oldP.name]);
    
    if (newPRes.rows.length > 0) {
      const newP = newPRes.rows[0];
      // Update missing config
      await newClient.query(`
        UPDATE "Project" SET 
          alias = $1,
          client = $2,
          vertical = $3,
          fanpage = $4,
          instagram = $5,
          whatsapp = $6,
          webchat = $7,
          website = $8,
          persona = $9,
          geo = $10,
          status = $11,
          "dateStart" = $12,
          "dateEnd" = $13,
          "alertsEnabled" = $14,
          "alertEmails" = $15,
          "crmIntegrationId" = $16,
          "crmType" = $17,
          "botFlowType" = $18,
          "crmIntegrationIds" = $19
        WHERE id = $20
      `, [
        oldP.alias, oldP.client, oldP.vertical, oldP.fanpage || [], oldP.instagram || [],
        oldP.whatsapp || [], oldP.webchat || [], oldP.website, oldP.persona, oldP.geo,
        oldP.status || 'Activo', oldP.dateStart, oldP.dateEnd, oldP.alertsEnabled ?? true,
        oldP.alertEmails || [], oldP.crmIntegrationId, oldP.crmType, oldP.botFlowType,
        oldP.crmIntegrationIds || [], newP.id
      ]);
      updatedCount++;
      console.log(`Updated configuration for project: ${oldP.name}`);
    } else {
      // Insert new project
      // Generate a new ID or use the old one? Better use the old one so relations (if any) could theoretically be preserved, but let's just insert it with the old ID to be safe!
      await newClient.query(`
        INSERT INTO "Project" (
          id, name, alias, client, vertical, fanpage, instagram, whatsapp, webchat, website, persona, geo, status, "dateStart", "dateEnd", "workspaceId", "createdAt", "updatedAt", "alertsEnabled", "alertEmails", "crmIntegrationId", "crmType", "botFlowType", "crmIntegrationIds"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
        )
      `, [
        oldP.id, oldP.name, oldP.alias, oldP.client, oldP.vertical, oldP.fanpage || [], oldP.instagram || [], oldP.whatsapp || [], oldP.webchat || [], oldP.website, oldP.persona, oldP.geo, oldP.status || 'Activo', oldP.dateStart, oldP.dateEnd, workspaceId, oldP.createdAt || new Date(), oldP.updatedAt || new Date(), oldP.alertsEnabled ?? true, oldP.alertEmails || [], oldP.crmIntegrationId, oldP.crmType, oldP.botFlowType, oldP.crmIntegrationIds || []
      ]);
      insertedCount++;
      console.log(`Inserted missing project: ${oldP.name}`);
    }
  }

  console.log(`Successfully migrated configuration: ${updatedCount} updated, ${insertedCount} inserted.`);
  await oldClient.end();
  await newClient.end();
}

main().catch(console.error);
