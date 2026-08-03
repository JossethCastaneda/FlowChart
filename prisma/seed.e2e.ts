/**
 * prisma/seed.e2e.ts — Semillas E2E con dos tenants adversarios
 *
 * Crea dos workspaces completamente aislados (Agencia Alfa y Agencia Beta).
 * Son competidores: si A ve un byte de B, el producto está muerto.
 *
 * IDs determinísticos con prefijo e2e-alfa-* / e2e-beta-* para facilitar
 * los tests de aislamiento.
 *
 * ⚠️  NO ejecutar contra la base de datos de producción.
 *     Verificar DATABASE_URL apunta a una base de test antes de correr.
 *
 * Uso: npx tsx prisma/seed.e2e.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ── Deterministic IDs ──────────────────────────────────────────────────────
const IDS = {
  alfa: {
    user:      "e2e-alfa-user-owner",
    invited:   "e2e-alfa-user-invited",
    workspace: "e2e-alfa-workspace",
    member:    "e2e-alfa-member-owner",
    memberInv: "e2e-alfa-member-invited",
    project:   "e2e-alfa-project",
    brief:     "e2e-alfa-brief",
    task:      "e2e-alfa-task",
    invite:    "e2e-alfa-invite",
    aiUsage:   "e2e-alfa-ai-usage",
  },
  beta: {
    user:      "e2e-beta-user-owner",
    invited:   "e2e-beta-user-invited",
    workspace: "e2e-beta-workspace",
    member:    "e2e-beta-member-owner",
    memberInv: "e2e-beta-member-invited",
    project:   "e2e-beta-project",
    brief:     "e2e-beta-brief",
    task:      "e2e-beta-task",
    invite:    "e2e-beta-invite",
    aiUsage:   "e2e-beta-ai-usage",
  },
} as const;

// Export for tests to reference
export { IDS as E2E_IDS };

async function cleanE2E() {
  // Delete in dependency order to respect foreign keys
  const allIds = [IDS.alfa, IDS.beta];

  for (const ids of allIds) {
    await prisma.aiUsage.deleteMany({ where: { id: ids.aiUsage } }).catch(() => {});
    await prisma.task.deleteMany({ where: { id: ids.task } }).catch(() => {});
    await prisma.brief.deleteMany({ where: { id: ids.brief } }).catch(() => {});
    await prisma.workspaceInvite.deleteMany({ where: { id: ids.invite } }).catch(() => {});
    await prisma.project.deleteMany({ where: { id: ids.project } }).catch(() => {});
    await prisma.workspaceMember.deleteMany({ where: { id: { in: [ids.member, ids.memberInv] } } }).catch(() => {});
    await prisma.workspace.deleteMany({ where: { id: ids.workspace } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: { in: [ids.user, ids.invited] } } }).catch(() => {});
  }
}

async function seedTenant(
  label: "alfa" | "beta",
  config: {
    workspaceName: string;
    ownerEmail: string;
    ownerName: string;
    invitedEmail: string;
    invitedName: string;
    projectName: string;
    briefTitle: string;
    taskTitle: string;
    aiModel: string;
  }
) {
  const ids = IDS[label];

  // 1. Users
  const owner = await prisma.user.create({
    data: {
      id: ids.user,
      email: config.ownerEmail,
      name: config.ownerName,
    },
  });

  const invited = await prisma.user.create({
    data: {
      id: ids.invited,
      email: config.invitedEmail,
      name: config.invitedName,
    },
  });

  // 2. Workspace
  const workspace = await prisma.workspace.create({
    data: {
      id: ids.workspace,
      name: config.workspaceName,
      slug: `e2e-${label}`,
      plan: "pro",
    },
  });

  // 3. Members
  await prisma.workspaceMember.create({
    data: {
      id: ids.member,
      workspaceId: workspace.id,
      userId: owner.id,
      role: "OWNER",
    },
  });

  await prisma.workspaceMember.create({
    data: {
      id: ids.memberInv,
      workspaceId: workspace.id,
      userId: invited.id,
      role: "MEMBER",
    },
  });

  // 4. Invite (pending, for testing invite isolation)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.workspaceInvite.create({
    data: {
      id: ids.invite,
      workspaceId: workspace.id,
      email: `pending-${label}@e2e.local`,
      token: `e2e-invite-token-${label}`,
      role: "MEMBER",
      expires: expiresAt,
      invitedById: owner.id,
    },
  });

  // 5. Project
  const project = await prisma.project.create({
    data: {
      id: ids.project,
      name: config.projectName,
      workspaceId: workspace.id,
      client: `Cliente ${label.toUpperCase()}`,
      vertical: "ecommerce",
      status: "Activo",
    },
  });

  // 6. Brief
  await prisma.brief.create({
    data: {
      id: ids.brief,
      workspaceId: workspace.id,
      projectId: project.id,
      title: config.briefTitle,
      content: { objective: `Brief de prueba para ${label}`, kpis: ["CPL < $5"] },
      status: "Approved",
    },
  });

  // 7. Task (op)
  await prisma.task.create({
    data: {
      id: ids.task,
      title: config.taskTitle,
      workspaceId: workspace.id,
      projectId: project.id,
      priority: "P1",
      status: "WIP",
      createdBy: owner.id,
    },
  });

  // 8. AI Usage
  await prisma.aiUsage.create({
    data: {
      id: ids.aiUsage,
      workspaceId: workspace.id,
      route: "/api/agents/orchestrate",
      model: config.aiModel,
      provider: "gemini",
      tokensIn: 1500,
      tokensOut: 800,
      estimatedCostUsd: 0.003,
      feature: "copilot",
    },
  });

  console.log(`✅ Tenant ${label.toUpperCase()} seeded: ${config.workspaceName}`);
  return { owner, invited, workspace, project };
}

async function main() {
  // Safety: print the database host
  const dbUrl = process.env.DATABASE_URL || "";
  const hostMatch = dbUrl.match(/@([^/:]+)/);
  const host = hostMatch?.[1] || "UNKNOWN";
  console.log(`[seed.e2e] target database host: ${host}`);

  if (host.includes("neon.tech") || host.includes("production")) {
    console.error("❌ ABORT: DATABASE_URL points to production. Refusing to seed.");
    process.exit(1);
  }

  console.log("[seed.e2e] Cleaning previous E2E data...");
  await cleanE2E();

  console.log("[seed.e2e] Seeding Tenant A (Agencia Alfa)...");
  await seedTenant("alfa", {
    workspaceName: "E2E Agencia Alfa",
    ownerEmail: "alfa@e2e.local",
    ownerName: "Ana Alfa",
    invitedEmail: "miembro-alfa@e2e.local",
    invitedName: "Miguel Alfa",
    projectName: "Campaña Verano Alfa",
    briefTitle: "Brief Lanzamiento Alfa",
    taskTitle: "Diseñar creativos Alfa",
    aiModel: "gemini-2.5-flash",
  });

  console.log("[seed.e2e] Seeding Tenant B (Agencia Beta)...");
  await seedTenant("beta", {
    workspaceName: "E2E Agencia Beta",
    ownerEmail: "beta@e2e.local",
    ownerName: "Bruno Beta",
    invitedEmail: "miembro-beta@e2e.local",
    invitedName: "María Beta",
    projectName: "Campaña Invierno Beta",
    briefTitle: "Brief Estrategia Beta",
    taskTitle: "Configurar audiencias Beta",
    aiModel: "gemini-2.0-flash",
  });

  console.log("\n🎯 E2E seed complete. Two adversarial tenants ready.");
  console.log("   Alfa IDs:", JSON.stringify(IDS.alfa, null, 2));
  console.log("   Beta IDs:", JSON.stringify(IDS.beta, null, 2));
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
