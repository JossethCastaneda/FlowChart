const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const post = await prisma.scheduledPost.findFirst({
    where: { status: 'Failed' },
    orderBy: { updatedAt: 'desc' }
  });
  console.log(post ? post.error : "No failed posts found");
}

main().catch(console.error).finally(() => prisma.$disconnect());
