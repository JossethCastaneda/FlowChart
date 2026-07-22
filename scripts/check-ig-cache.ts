import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("=== Instagram Asset Cache ===");
  const assets = await prisma.integrationAssetCache.findMany({
    where: { assetType: "ig_account" },
    select: { externalId: true, workspaceId: true, syncedAt: true, integrationId: true },
  });
  console.log("IG Assets:", JSON.stringify(assets, null, 2));

  console.log("\n=== Instagram Integrations ===");
  const integrations = await prisma.integration.findMany({
    where: { provider: "instagram" },
    select: {
      id: true,
      connected: true,
      connectedAt: true,
      workspaceId: true,
      credentials: true,
    },
  });
  integrations.forEach(i => {
    const creds = i.credentials as any;
    console.log(`Integration ${i.id}:`);
    console.log(`  workspaceId: ${i.workspaceId}`);
    console.log(`  connected: ${i.connected}`);
    console.log(`  instagramUserId: ${creds?.instagramUserId}`);
    console.log(`  username: ${creds?.username}`);
    console.log(`  hasToken: ${!!creds?.accessToken}`);
  });

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
