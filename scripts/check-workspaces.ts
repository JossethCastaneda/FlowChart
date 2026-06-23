import prisma from '../lib/prisma';

async function main() {
  const workspaces = await prisma.workspace.findMany();
  console.log('Workspaces:', workspaces.length);
  for (const w of workspaces) {
    console.log(` - ID: ${w.id}, Name: ${w.name}`);
  }

  const integrations = await prisma.integration.findMany();
  console.log('\nIntegrations:', integrations.length);
  for (const integ of integrations) {
    console.log(` - ID: ${integ.id}, WorkspaceID: ${integ.workspaceId}, Provider: ${integ.provider}, Connected: ${integ.connected}`);
  }

  const workspaceConnections = await prisma.workspaceBotmakerConnection.findMany();
  console.log('\nWorkspace Botmaker Connections (if any):', workspaceConnections.length);
  for (const conn of workspaceConnections) {
    console.log(` - WorkspaceID: ${conn.workspaceId}, BaseURL: ${conn.baseUrl}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
