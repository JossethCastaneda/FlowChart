import prisma from "./lib/prisma";
import { triggerAutoAriaForProject } from "./lib/crecimiento/aria-auto";

async function backfill() {
  const projects = await prisma.project.findMany({
    where: {
      ariaDatasets: { none: {} } // Solo proyectos que no tengan datasets aún
    }
  });

  console.log(`Encontrados ${projects.length} proyectos sin modelos Aria.`);

  for (const project of projects) {
    console.log(`Generando para proyecto: ${project.name}`);
    await triggerAutoAriaForProject(
      project.id,
      project.workspaceId,
      project.name,
      project.client,
      project.vertical
    );
  }

  console.log("Backfill completado.");
}

backfill().catch(console.error).finally(() => prisma.$disconnect());
