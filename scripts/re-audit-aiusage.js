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

async function checkIdentity(client) {
  const { rows: countRows } = await client.query('SELECT COUNT(*) as cnt FROM "AiUsage"');
  const count = parseInt(countRows[0].cnt, 10);
  
  const { rows: colRows } = await client.query(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'AiUsage' AND column_name = 'estimatedCostUsd'
    ) as exists
  `);
  
  return {
    count,
    hasEstimatedCostUsd: colRows[0].exists
  };
}

function sanitizeId(id) {
  return id ? id.substring(0, 8) + '***' : 'N/A';
}

async function main() {
  const prodUrl = process.env.DATABASE_URL;
  const recoveryUrl = process.env.RECOVERY_DB_URL;
  const targetUrl = process.env.TEST_DB_URL;

  const prodFp = normalizeEndpoint(prodUrl);
  const recFp = normalizeEndpoint(recoveryUrl);
  const targetFp = normalizeEndpoint(targetUrl);

  const prodClient = new Client({ connectionString: prodUrl });
  const recoveryClient = new Client({ connectionString: recoveryUrl });
  const targetClient = new Client({ connectionString: targetUrl });

  await prodClient.connect();
  await recoveryClient.connect();
  await targetClient.connect();

  console.log('=== PHASE 1: IDENTITIES ===');
  console.log(`PROD_HOST: ${prodFp.split('/')[0].substring(0,10)}***`);
  console.log(`REC_HOST: ${recFp.split('/')[0].substring(0,10)}***`);
  console.log(`TEST_HOST: ${targetFp.split('/')[0].substring(0,10)}***`);
  
  const prodId = await checkIdentity(prodClient);
  console.log(`PROD: count=${prodId.count} oldSchema=${prodId.hasEstimatedCostUsd}`);
  
  const recId = await checkIdentity(recoveryClient);
  console.log(`REC: count=${recId.count} oldSchema=${recId.hasEstimatedCostUsd}`);
  
  const testId = await checkIdentity(targetClient);
  console.log(`TEST: count=${testId.count} oldSchema=${testId.hasEstimatedCostUsd}`);

  console.log('\n=== PHASE 2: TEST ROWS ===');
  const { rows: testRows } = await targetClient.query('SELECT * FROM "AiUsage"');
  const { rows: recRows } = await recoveryClient.query('SELECT * FROM "AiUsage"');
  
  const historicalIds = recRows.map(r => r.id);
  
  for (let i = 0; i < testRows.length; i++) {
    const row = testRows[i];
    console.log(`ROW ${i+1}:`);
    console.log(`  id: ${sanitizeId(row.id)}`);
    console.log(`  workspaceId: ${sanitizeId(row.workspaceId)}`);
    console.log(`  requestId present: ${row.requestId ? 'YES' : 'NO'}`);
    
    let idemCategory = 'OTHER';
    if (row.idempotencyKey && row.idempotencyKey.startsWith('PROVENANCE_RECOVERY_')) {
      idemCategory = 'PROVENANCE_RECOVERY';
    } else if (row.idempotencyKey) {
      idemCategory = 'NORMAL';
    }
    
    console.log(`  idempotencyCategory: ${idemCategory}`);
    console.log(`  provider: ${row.provider}`);
    console.log(`  model: ${row.model}`);
    console.log(`  tokensIn: ${row.tokensIn}`);
    console.log(`  tokensOut: ${row.tokensOut}`);
    console.log(`  providerCostUsd: ${row.providerCostUsd === null ? 'NULL' : 'NON-NULL'}`);
    console.log(`  customerChargeUsd: ${row.customerChargeUsd === null ? 'NULL' : 'NON-NULL'}`);
    console.log(`  MATCHES_HISTORICAL_ID: ${historicalIds.includes(row.id) ? 'YES' : 'NO'}`);
    console.log(`  PROVENANCE_CORRECT: ${row.idempotencyKey === 'PROVENANCE_RECOVERY_' + row.id ? 'YES' : 'NO'}`);
  }

  console.log('\n=== PHASE 3: PRODUCTION VERIFICATION ===');
  const { rows: prodRows } = await prodClient.query('SELECT * FROM "AiUsage"');
  const prodIds = prodRows.map(r => r.id);
  
  if (historicalIds.length > 0) {
    console.log(`PRODUCTION_CONTAINS_HISTORICAL_ROW_1: ${prodIds.includes(historicalIds[0]) ? 'YES' : 'NO'}`);
  }
  if (historicalIds.length > 1) {
    console.log(`PRODUCTION_CONTAINS_HISTORICAL_ROW_2: ${prodIds.includes(historicalIds[1]) ? 'YES' : 'NO'}`);
  }

  console.log('\n=== PHASE 7: RELATIONAL FORENSICS ===');
  for (let i = 0; i < historicalIds.length; i++) {
    const hid = historicalIds[i];
    
    const { rows: tables } = await prodClient.query(`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
    `);
    const tableNames = tables.map(t => t.table_name);
    
    let foundRef = false;
    if (tableNames.includes('BillingUsageEvent')) {
      const { rows: bue } = await prodClient.query(`SELECT id FROM "BillingUsageEvent" WHERE "aiUsageId" = $1 OR "stripeMeterEventIdentifier" LIKE $2`, [hid, '%' + hid + '%']);
      if (bue.length > 0) foundRef = true;
    }
    
    console.log(`RELATIONAL_CLASSIFICATION_ROW_${i+1}: ${foundRef ? 'FINANCIAL_RECONCILIATION_REQUIRED' : 'DATA_ONLY_RECOVERY'}`);
  }

  await prodClient.end();
  await recoveryClient.end();
  await targetClient.end();
}

main().catch(console.error);
