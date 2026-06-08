import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const posts = await prisma.scheduledPost.findMany({
    orderBy: { createdAt: 'desc' },
    take: 1
  });
  console.log('Latest post:', posts[0]?.id, posts[0]?.error);
}
main().catch(console.error);
