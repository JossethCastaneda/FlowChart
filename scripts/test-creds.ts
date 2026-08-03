import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import prisma from '../lib/prisma';

async function main() {
  const intg = await prisma.integration.findFirst({
    where: { provider: 'google' }
  });
  console.log(JSON.stringify(intg?.credentials, null, 2));
}

main().finally(() => prisma.$disconnect());
