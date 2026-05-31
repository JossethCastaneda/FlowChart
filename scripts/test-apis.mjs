/**
 * SODARE — Script de prueba E2E
 * Crea datos de prueba via Prisma y luego los elimina
 * 
 * Uso: npx tsx scripts/test-apis.mjs
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║   SODARE — Test de APIs E2E              ║");
  console.log("╚══════════════════════════════════════════╝\n");

  try {
    // 1. Verificar conexión
    console.log("1️⃣  Verificando conexión a DB...");
    const userCount = await prisma.user.count();
    console.log(`   ✅ Conectado. ${userCount} usuarios en la DB.\n`);

    // 2. Listar workspaces
    console.log("2️⃣  Listando workspaces...");
    const workspaces = await prisma.workspace.findMany({
      include: { 
        members: { include: { user: { select: { name: true, email: true } } } },
        _count: { select: { projects: true, tasks: true, invites: true } }
      }
    });
    
    if (workspaces.length === 0) {
      console.log("   ⚠️  No hay workspaces. Nada que probar.\n");
      return;
    }
    
    for (const ws of workspaces) {
      console.log(`   📁 ${ws.name} (${ws.slug}) — Plan: ${ws.plan}`);
      console.log(`      Members: ${ws.members.length}, Projects: ${ws._count.projects}, Tasks: ${ws._count.tasks}`);
      for (const m of ws.members) {
        console.log(`      👤 ${m.user.name || m.user.email} — ${m.role}`);
      }
    }
    console.log();

    const testWs = workspaces[0];
    console.log(`   🎯 Usando workspace: "${testWs.name}" (${testWs.id})\n`);

    // 3. Crear Tasks de prueba
    console.log("3️⃣  Creando 3 tasks de prueba...");
    const tasksToCreate = [
      { title: "[TEST] Setup pixel CAPI + UTMs", description: "Configurar server-side tracking", assignee: "Dev Team", priority: "P0", status: "WIP" },
      { title: "[TEST] Review copy campaña Q3", description: "A/B test headlines para Meta Ads", assignee: "Carlos R.", priority: "P1", status: "Backlog" },
      { title: "[TEST] Reporte mensual ROAS", description: "CPM, CTR, ROAS por canal", assignee: "Ana G.", priority: "P2", status: "Done" },
    ];
    
    const createdTasks = [];
    for (const t of tasksToCreate) {
      const task = await prisma.task.create({
        data: { ...t, workspaceId: testWs.id },
      });
      createdTasks.push(task);
      console.log(`   ✅ Task creada: "${task.title}" (${task.priority}/${task.status}) → ID: ${task.id}`);
    }
    console.log();

    // 4. Crear Briefs de prueba
    console.log("4️⃣  Creando 2 briefs de prueba...");
    const briefsToCreate = [
      { 
        title: "[TEST] Campaña Black Friday 2026",
        content: { objective: "Incrementar ventas 30% vs 2025", audience: "Mujeres 25-45, CDMX", channels: "Meta, IG, TikTok", kpis: "ROAS >4x, CPA <$15", budget: "$50,000 MXN" },
        status: "Review",
      },
      {
        title: "[TEST] Launch Producto Nuevo",
        content: { objective: "Awareness + consideración", audience: "Hombres 18-35, Nacional", channels: "Meta, YouTube", kpis: "Reach 1M, CPM <$3", budget: "$25,000 MXN" },
        status: "Draft",
      },
    ];

    const createdBriefs = [];
    for (const b of briefsToCreate) {
      const brief = await prisma.brief.create({
        data: { ...b, workspaceId: testWs.id },
      });
      createdBriefs.push(brief);
      console.log(`   ✅ Brief creado: "${brief.title}" (${brief.status}) → ID: ${brief.id}`);
    }
    console.log();

    // 5. Verificar conteos
    console.log("5️⃣  Verificando conteos post-creación...");
    const taskCount = await prisma.task.count({ where: { workspaceId: testWs.id } });
    const briefCount = await prisma.brief.count({ where: { workspaceId: testWs.id } });
    const projectCount = await prisma.project.count({ where: { workspaceId: testWs.id } });
    console.log(`   📊 Tasks: ${taskCount}, Briefs: ${briefCount}, Projects: ${projectCount}`);
    console.log();

    // 6. Listar tasks por status
    console.log("6️⃣  Tasks por status:");
    const allTasks = await prisma.task.findMany({
      where: { workspaceId: testWs.id },
      orderBy: [{ status: "asc" }, { priority: "asc" }],
    });
    for (const t of allTasks) {
      const icon = t.status === "Done" ? "✅" : t.status === "WIP" ? "🔄" : "📋";
      console.log(`   ${icon} [${t.priority}] ${t.title} — ${t.status}`);
    }
    console.log();

    // 7. Listar briefs por status
    console.log("7️⃣  Briefs por status:");
    const allBriefs = await prisma.brief.findMany({
      where: { workspaceId: testWs.id },
      orderBy: { status: "asc" },
    });
    for (const b of allBriefs) {
      const icon = b.status === "Approved" ? "✅" : b.status === "Review" ? "👁️" : "📝";
      console.log(`   ${icon} ${b.title} — ${b.status}`);
    }
    console.log();

    // 8. Listar integrations
    console.log("8️⃣  Integraciones:");
    const integrations = await prisma.integration.findMany({
      where: { workspaceId: testWs.id },
    });
    if (integrations.length === 0) {
      console.log("   (ninguna conectada)");
    } else {
      for (const i of integrations) {
        console.log(`   ${i.connected ? "🟢" : "🔴"} ${i.provider} — ${i.connected ? "Conectada" : "Desconectada"}`);
      }
    }
    console.log();

    // 9. Listar projects
    console.log("9️⃣  Proyectos existentes:");
    const projects = await prisma.project.findMany({
      where: { workspaceId: testWs.id },
      select: { id: true, name: true, alias: true, status: true, client: true },
    });
    if (projects.length === 0) {
      console.log("   (ninguno)");
    } else {
      for (const p of projects) {
        console.log(`   📂 ${p.name}${p.alias ? ` (${p.alias})` : ""} — ${p.status}${p.client ? ` · ${p.client}` : ""}`);
      }
    }
    console.log();

    // 10. LIMPIAR — Eliminar datos de prueba
    console.log("🔟  Eliminando datos de prueba [TEST]...");
    
    for (const task of createdTasks) {
      await prisma.task.delete({ where: { id: task.id } });
      console.log(`   🗑️  Task eliminada: "${task.title}"`);
    }
    
    for (const brief of createdBriefs) {
      await prisma.brief.delete({ where: { id: brief.id } });
      console.log(`   🗑️  Brief eliminado: "${brief.title}"`);
    }
    console.log();

    // 11. Verificar limpieza
    console.log("1️⃣1️⃣  Verificando limpieza final...");
    const finalTaskCount = await prisma.task.count({ where: { workspaceId: testWs.id } });
    const finalBriefCount = await prisma.brief.count({ where: { workspaceId: testWs.id } });
    console.log(`   📊 Tasks: ${finalTaskCount}, Briefs: ${finalBriefCount}`);
    console.log();

    console.log("╔══════════════════════════════════════════╗");
    console.log("║   ✅ TEST COMPLETADO — TODO LIMPIO        ║");
    console.log("╚══════════════════════════════════════════╝\n");

  } catch (err) {
    console.error("\n❌ ERROR:", err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
