import prisma from "../lib/prisma";
async function main() {
  await prisma.inboxMessage.delete({ 
    where: { id: "cmrv5a707000004kzw10wkfdg" }
  });
  console.log("Deleted duplicate llll message");
}
main().finally(() => process.exit(0));
