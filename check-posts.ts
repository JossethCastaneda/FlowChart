import prisma from './lib/prisma';

async function main() {
  const posts = await prisma.scheduledPost.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      status: true,
      scheduledAt: true,
      qStashMessageId: true,
      error: true,
      createdAt: true
    }
  });
  console.log(JSON.stringify(posts, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => console.log("Done"));
