import prisma from '../lib/prisma';
import { decryptToken } from '../lib/encryption';

async function main() {
  const integrations = await prisma.integration.findMany({
    where: { provider: 'botmaker' }
  });

  console.log(`Found ${integrations.length} Botmaker integrations in the database.\n`);

  for (const integ of integrations) {
    const ws = await prisma.workspace.findUnique({ where: { id: integ.workspaceId } });
    console.log(`Workspace: ${ws?.name} (ID: ${integ.workspaceId})`);
    console.log(`Integration ID: ${integ.id}, Connected: ${integ.connected}`);
    
    const creds = integ.credentials as any || {};
    const baseUrl = creds.baseUrl || 'https://api.botmaker.com/v2.0';
    console.log(`Base URL: ${baseUrl}`);
    
    if (!creds.accessToken) {
      console.log(' - No accessToken stored.');
      console.log('--------------------------------------------------\n');
      continue;
    }

    try {
      const token = decryptToken(creds.accessToken);
      console.log(` - Decrypted token (length: ${token.length}, prefix: ${token.slice(0, 8)}...)`);
      
      const res = await fetch(`${baseUrl}/channels`, {
        headers: {
          'access-token': token,
          'Accept': 'application/json'
        }
      });
      
      if (res.ok) {
        const channels = await res.json();
        console.log(` - Status: SUCCESS (200), returned ${channels.length} channels`);
        channels.forEach((c: any) => {
          console.log(`    * Channel: ${c.id} (${c.name}) [Platform: ${c.platform}, Status: ${c.status}]`);
        });
      } else {
        console.log(` - Status: FAILED (${res.status}), Response: ${(await res.text()).slice(0, 100)}`);
      }
    } catch (e: any) {
      console.log(` - Decryption/Request Error: ${e.message}`);
    }
    console.log('--------------------------------------------------\n');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
