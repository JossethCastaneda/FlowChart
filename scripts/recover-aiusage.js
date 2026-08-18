require('dotenv').config();
const { Client } = require('pg');

function normalizeEndpoint(urlStr) {
  try {
    const url = new URL(urlStr);
    const host = url.hostname.replace('-pooler', '');
    return `${host}${url.pathname}`;
  } catch (e) {
    return null;
  }
}

async function verifyFingerprint(client, expectedCountOrMore, expectOldSchema, label, isTest = false) {
  const { rows: countRows } = await client.query('SELECT COUNT(*) as cnt FROM "AiUsage"');
  const actualCount = parseInt(countRows[0].cnt, 10);
  
  if (!isTest && actualCount !== expectedCountOrMore) {
    throw new Error(`HARD FAIL: ${label} fingerprint mismatch. Expected ${expectedCountOrMore} rows, found ${actualCount}`);
  }

  if (isTest && actualCount > 2) {
      throw new Error(`HARD FAIL: ${label} fingerprint mismatch. Target DB has unexpected data (${actualCount} rows).`);
  }

  const { rows: colRows } = await client.query(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'AiUsage' AND column_name = 'estimatedCostUsd'
    ) as exists
  `);
  
  const hasOldSchema = colRows[0].exists;
  
  if (hasOldSchema !== expectOldSchema) {
    throw new Error(`HARD FAIL: ${label} fingerprint mismatch. Expected estimatedCostUsd to exist: ${expectOldSchema}, found: ${hasOldSchema}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const isProductionRecovery = args.includes('--execute-production-recovery');

  const prodUrl = process.env.DATABASE_URL;
  const recoveryUrl = process.env.RECOVERY_DB_URL;
  const targetUrl = isProductionRecovery ? process.env.DATABASE_URL : process.env.TEST_DB_URL;

  if (!prodUrl || !recoveryUrl || !targetUrl) {
    console.error('HARD FAIL: Missing DATABASE_URL, RECOVERY_DB_URL or TEST_DB_URL');
    process.exit(1);
  }

  const prodFp = normalizeEndpoint(prodUrl);
  const recFp = normalizeEndpoint(recoveryUrl);
  const targetFp = normalizeEndpoint(targetUrl);

  if (recFp === prodFp) {
    console.error('HARD FAIL: RECOVERY_DB_URL points to Production');
    process.exit(1);
  }
  
  if (!isProductionRecovery && targetFp === prodFp) {
    console.error('HARD FAIL: TEST_DB_URL points to Production');
    process.exit(1);
  }
  
  if (recFp === targetFp) {
    console.error('HARD FAIL: RECOVERY_DB_URL and Target URL point to the same database');
    process.exit(1);
  }

  const prodClient = new Client({ connectionString: prodUrl });
  const recoveryClient = new Client({ connectionString: recoveryUrl });
  const targetClient = new Client({ connectionString: targetUrl });

  await prodClient.connect();
  await recoveryClient.connect();
  // Only connect third client if it's different to avoid double-pool issues or just let it connect again.
  await targetClient.connect();

  try {
    console.log('Verifying DATABASE_URL (READ ONLY)...');
    // If we are doing production recovery, prod starts with 0 rows (the incident state)
    await verifyFingerprint(prodClient, 0, false, 'DATABASE_URL', isProductionRecovery);
    
    console.log('Verifying RECOVERY_DB_URL...');
    await verifyFingerprint(recoveryClient, 2, true, 'RECOVERY_DB_URL', false);
    
    console.log(`Verifying ${isProductionRecovery ? 'PRODUCTION' : 'TEST'} TARGET...`);
    // Using isTest = true allows 0 or 2 rows for idempotency runs
    await verifyFingerprint(targetClient, 0, false, 'TARGET_DB_URL', true);

    const { rows: lostRows } = await recoveryClient.query('SELECT * FROM "AiUsage"');
    console.log(`Found ${lostRows.length} lost records in historical branch.`);

    if (isProductionRecovery) {
      console.log('!!! EXECUTING PRODUCTION RECOVERY !!!');
    }

    await targetClient.query('BEGIN');

    let recovered = 0;
    let alreadyPresent = 0;

    for (const row of lostRows) {
      const idempotencyKey = `PROVENANCE_RECOVERY_${row.id}`;
      
      const { rows: existing } = await targetClient.query('SELECT id FROM "AiUsage" WHERE id = $1 OR "idempotencyKey" = $2', [row.id, idempotencyKey]);
      
      if (existing.length > 0) {
        alreadyPresent++;
        continue;
      }

      const insertQuery = `
        INSERT INTO "AiUsage" (
          id, "workspaceId", route, model, "tokensIn", "tokensOut", 
          "createdAt", feature, provider, 
          "customerChargeUsd", "idempotencyKey", "providerCostUsd", "requestId"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, 
          $7, $8, $9, 
          $10, $11, $12, $13
        )
      `;
      
      const values = [
        row.id, row.workspaceId, row.route, row.model, row.tokensIn, row.tokensOut,
        row.createdAt, row.feature, row.provider,
        null, 
        idempotencyKey, 
        null, 
        null
      ];

      await targetClient.query(insertQuery, values);
      recovered++;
    }

    await targetClient.query('COMMIT');
    console.log(`EXECUTION SUCCESS`);
    console.log(`RECOVERED=${recovered}`);
    console.log(`ALREADY_PRESENT=${alreadyPresent}`);
    console.log(`PRODUCTION_WRITES=${isProductionRecovery ? recovered : 0}`);
    
  } catch (error) {
    await targetClient.query('ROLLBACK');
    console.error(error.message || 'Transaction failed and rolled back');
  } finally {
    await prodClient.end();
    await recoveryClient.end();
    await targetClient.end();
  }
}

main().catch(console.error);
