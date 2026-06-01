import prisma from "../lib/prisma";

async function main() {
  const ws = await prisma.workspace.findMany({ select: { id: true, name: true } });
  console.log("=== WORKSPACES ===");
  ws.forEach(w => console.log(w.id, "|", w.name));

  const intg = await prisma.integration.findMany({
    select: { id: true, workspaceId: true, provider: true, connected: true, connectedBy: true }
  });
  console.log("\n=== INTEGRATIONS ===");
  if (intg.length === 0) console.log("(EMPTY - no integration records found!)");
  intg.forEach(i => console.log(JSON.stringify(i)));

  const members = await prisma.workspaceMember.findMany({
    select: { workspaceId: true, userId: true, role: true },
    include: { user: { select: { email: true } }, workspace: { select: { name: true } } }
  });
  console.log("\n=== MEMBERS ===");
  members.forEach(m => console.log(m.workspace.name, "|", m.user.email, "|", m.role));

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
