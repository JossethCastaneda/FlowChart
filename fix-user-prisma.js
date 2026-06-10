process.env.DATABASE_URL = "postgresql://neondb_owner:npg_eczPU6T0lHOB@ep-long-unit-ape6kzxh-pooler.c-7.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require";

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = 'jcastaneda@lidmarketing.com';
  const workspaceId = 'cmprfigpy000004l7ssqkjwtb';

  console.log(`Checking user: ${email}`);
  let user = await prisma.user.findUnique({ where: { email } });
  
  if (!user) {
    console.log("User not found in production! Creating user...");
    user = await prisma.user.create({
      data: {
        email,
        name: 'Josseth Castañeda',
      }
    });
    console.log("Created user:", user.id);
  } else {
    console.log("Found user:", user.id);
  }

  console.log("Checking workspace membership...");
  let member = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: user.id
      }
    }
  });

  if (!member) {
    console.log("User is not in the workspace. Adding now...");
    member = await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: user.id,
        role: "OWNER"
      }
    });
    console.log("Added user to workspace:", member.id);
  } else {
    console.log("User is ALREADY in the workspace with role:", member.role);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
