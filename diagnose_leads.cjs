require('dotenv').config({path:'.env'});
const { Pool } = require('pg');
const crypto = require('crypto');

const META_API_VERSION = 'v22.0';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '';
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

function decryptToken(encryptedText) {
  if (!encryptedText) return null;
  if (!encryptedText.startsWith('enc:')) {
    console.log('  (token is plaintext, using as-is)');
    return encryptedText;
  }
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
    console.log('  ERROR: ENCRYPTION_KEY not set or invalid length:', ENCRYPTION_KEY.length);
    return null;
  }
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 4) { console.log('  Bad enc format, parts:', parts.length); return null; }
    const [, ivHex, authTagHex, encryptedHex] = parts;
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch(e) {
    console.log('  Decrypt error:', e.message);
    return null;
  }
}

async function go() {
  console.log('ENCRYPTION_KEY length:', ENCRYPTION_KEY.length, '(should be 64)');

  // Get the Formulario project
  const { rows: formulario } = await p.query(`
    SELECT p.id, p.alias, p."workspaceId", c.config as channel_config
    FROM "Project" p
    JOIN "Channel" c ON c."projectId" = p.id
    WHERE p.alias ILIKE '%formulario%' AND c.config->>'platformId' = 'meta'
    LIMIT 1
  `);

  if (!formulario.length) {
    console.log('No Formulario project with meta channel found.');
    await p.end();
    return;
  }

  const f = formulario[0];
  const cfg = f.channel_config || {};
  console.log(`\n=== Proyecto: ${f.alias} ===`);
  console.log(`  workspaceId: ${f.workspaceId}`);
  console.log(`  Goal: ${cfg.goal}`);
  console.log(`  Ad Accounts: ${JSON.stringify(cfg.adAccounts)}`);

  // Get meta_ads integration
  const { rows: integrations } = await p.query(`
    SELECT provider, connected, credentials FROM "Integration"
    WHERE "workspaceId" = $1 AND provider = 'meta_ads'
    LIMIT 1
  `, [f.workspaceId]);

  if (!integrations.length) {
    console.log('  No meta_ads integration found!');
    const { rows: all } = await p.query(`SELECT provider, connected FROM "Integration" WHERE "workspaceId" = $1`, [f.workspaceId]);
    console.log('  Available integrations:', all.map(i => `${i.provider}(${i.connected ? 'on' : 'off'})`).join(', '));
    await p.end();
    return;
  }

  const intg = integrations[0];
  const creds = intg.credentials || {};
  const rawToken = creds.accessToken || '';
  console.log(`\n  meta_ads connected: ${intg.connected}`);
  console.log(`  raw accessToken preview: ${rawToken.slice(0, 40)}...`);

  const token = decryptToken(rawToken);
  if (!token) {
    console.log('  ERROR: Token decryption failed!');
    await p.end();
    return;
  }
  console.log(`  Decrypted token preview: ${token.slice(0, 30)}...`);

  // Now call Meta API
  const adAccounts = cfg.adAccounts || [];
  for (const accRaw of adAccounts) {
    const accId = accRaw.startsWith('act_') ? accRaw : `act_${accRaw}`;
    console.log(`\n  Calling Meta for ${accId} (last 7d)...`);
    
    const url = `https://graph.facebook.com/${META_API_VERSION}/${accId}/insights?` +
      `fields=spend,impressions,clicks,actions&level=account&time_increment=1&date_preset=last_7d&limit=100&access_token=${token}`;

    const res = await fetch(url);
    const json = await res.json();

    if (json.error) {
      console.log(`  Meta error: ${json.error.message} (code ${json.error.code})`);
      continue;
    }

    const days = json.data || [];
    console.log(`  Days returned: ${days.length}`);

    const actionSums = {};
    days.forEach(day => {
      (day.actions || []).forEach(a => {
        actionSums[a.action_type] = (actionSums[a.action_type] || 0) + parseFloat(a.value || '0');
      });
    });

    const sorted = Object.entries(actionSums).sort((a, b) => b[1] - a[1]);
    if (!sorted.length) {
      console.log('  No actions returned in 7 days');
      // Try broader range
      const url2 = url.replace('last_7d', 'this_month');
      const res2 = await fetch(url2);
      const json2 = await res2.json();
      const actionSums2 = {};
      (json2.data || []).forEach(day => {
        (day.actions || []).forEach(a => {
          actionSums2[a.action_type] = (actionSums2[a.action_type] || 0) + parseFloat(a.value || '0');
        });
      });
      const sorted2 = Object.entries(actionSums2).sort((a, b) => b[1] - a[1]);
      if (!sorted2.length) console.log('  No actions this month either');
      else {
        console.log('  Actions this month:');
        sorted2.forEach(([at, t]) => console.log(`    ${at}: ${t}`));
      }
    } else {
      console.log('  Actions (7d):');
      sorted.forEach(([at, t]) => console.log(`    ${at}: ${t}`));
    }
  }

  await p.end();
  console.log('\n=== Done ===');
}
go().catch(e => { console.error(e.message); process.exit(1); });
