import prisma from '../lib/prisma';
import { decryptToken } from '../lib/encryption';

async function main() {
  const integration = await prisma.integration.findFirst({
    where: { provider: 'botmaker' }
  });

  if (!integration) {
    console.error('No Botmaker integration found in the database.');
    await prisma.$disconnect();
    return;
  }

  console.log('Integration ID:', integration.id);
  console.log('Provider:', integration.provider);
  console.log('Connected:', integration.connected);
  console.log('Credentials Keys:', Object.keys(integration.credentials as any || {}));

  const decryptedToken = decryptToken((integration.credentials as any).accessToken);
  console.log('Decrypted token (first 5 chars):', decryptedToken.slice(0, 5) + '...');

  const baseUrl = (integration.credentials as any).baseUrl || 'https://api.botmaker.com/v2.0';
  console.log('Base URL:', baseUrl);

  // Let's call /channels
  console.log('Fetching channels...');
  const channelsRes = await fetch(`${baseUrl}/channels`, {
    headers: {
      'access-token': decryptedToken,
      'Accept': 'application/json'
    }
  });

  if (!channelsRes.ok) {
    console.error('Failed to fetch channels. Status:', channelsRes.status);
    const body = await channelsRes.text();
    console.error('Body:', body.slice(0, 200));
    await prisma.$disconnect();
    return;
  }

  const channels = await channelsRes.json();
  console.log(`Fetched ${channels.length} channels:`);
  channels.forEach((ch: any) => {
    console.log(` - ID: ${ch.id}, Name: ${ch.name}, Platform: ${ch.platform}, Status: ${ch.status}`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);
