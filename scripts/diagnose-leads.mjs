/**
 * SCRIPT DE DIAGNÓSTICO — Lee el proyecto desde la DB y hace
 * la misma llamada que la app para ver los action_types REALES de Meta.
 *
 * Uso: node scripts/diagnose-leads.mjs
 */
import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'fs';
import { createDecipheriv } from 'crypto';

const prisma = new PrismaClient();
const META_API_VERSION = 'v22.0';

// Decrypt token (same logic as lib/server-auth.ts)
function decryptToken(encrypted) {
  if (!encrypted) return null;
  try {
    const secret = process.env.TOKEN_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET || '';
    const key = Buffer.from(secret.slice(0, 32).padEnd(32, '0'));
    const [ivHex, authTagHex, encryptedHex] = encrypted.split(':');
    if (!ivHex || !authTagHex || !encryptedHex) {
      // Plain text fallback (old tokens)
      return encrypted;
    }
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encryptedData = Buffer.from(encryptedHex, 'hex');
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
    return decrypted.toString('utf8');
  } catch(e) {
    // If decryption fails, maybe it's plain text
    return encrypted;
  }
}

async function run() {
  console.log('1. Reading all active projects from DB...\n');

  const projects = await prisma.project.findMany({
    where: { status: { in: ['EN VUELO', 'EN ÓRBITA', 'Activo'] } },
    include: { workspace: { include: { integrations: true } } },
  });

  console.log(`Found ${projects.length} active projects\n`);

  for (const p of projects) {
    const metaCh = p.channels?.find(ch => {
      const cfg = typeof ch.config === 'string' ? JSON.parse(ch.config) : (ch.config || {});
      return cfg.platformId === 'meta';
    });

    if (!metaCh) {
      console.log(`[${p.alias}] No Meta channel\n`);
      continue;
    }

    const cfg = typeof metaCh.config === 'string' ? JSON.parse(metaCh.config) : (metaCh.config || {});
    const goal = cfg.goal || '';
    const adAccounts = cfg.adAccounts || [];

    console.log(`[${p.alias}] Goal: "${goal}" | Ad Accounts: ${adAccounts.join(', ')}`);

    if (!adAccounts.length) {
      console.log('  → No ad accounts configured\n');
      continue;
    }

    // Get token
    const integration = p.workspace?.integrations?.find(i => i.provider === 'facebook');
    const rawToken = integration?.accessToken;
    if (!rawToken) {
      console.log('  → No Facebook integration token found\n');
      continue;
    }
    const token = decryptToken(rawToken);
    if (!token) {
      console.log('  → Token decryption failed\n');
      continue;
    }

    // Query Meta API for last 7 days
    for (const accRaw of adAccounts) {
      const accId = accRaw.startsWith('act_') ? accRaw : `act_${accRaw}`;
      const url = `https://graph.facebook.com/${META_API_VERSION}/${accId}/insights?` +
        `fields=spend,impressions,clicks,actions&level=account&time_increment=1&date_preset=last_7d&limit=50&access_token=${token}`;

      try {
        const res = await fetch(url);
        const json = await res.json();

        if (json.error) {
          console.log(`  [${accId}] Meta error: ${json.error.message}`);
          continue;
        }

        // Collect all action_types and their totals
        const actionSums = {};
        (json.data || []).forEach(day => {
          (day.actions || []).forEach(a => {
            actionSums[a.action_type] = (actionSums[a.action_type] || 0) + parseFloat(a.value || '0');
          });
        });

        const sorted = Object.entries(actionSums).sort((a, b) => b[1] - a[1]);
        console.log(`  [${accId}] Action types returned by Meta (${json.data?.length || 0} days):`);
        sorted.forEach(([at, total]) => {
          console.log(`    ${at}: ${total}`);
        });

        if (sorted.length === 0) {
          console.log(`    (No actions returned at all for this period)`);
        }
      } catch(e) {
        console.log(`  [${accId}] Fetch error: ${e.message}`);
      }
    }
    console.log('');
  }

  await prisma.$disconnect();
  console.log('Done.');
}

run().catch(e => { console.error(e); process.exit(1); });
