import prisma from '../lib/prisma';

async function main() {
  const meta = await prisma.metaAnalyticsCache.findMany({
    where: { endpoint: { startsWith: "botmaker_sessions_raw" } }
  });

  const counts: Record<string, number> = {};
  for (const record of meta) {
    const data = record.data as any;
    if (Array.isArray(data)) {
      counts[record.endpoint] = (counts[record.endpoint] || 0) + data.length;
    }
  }
  console.log("Cached sessions by version:", counts);
}

main().catch(console.error);
