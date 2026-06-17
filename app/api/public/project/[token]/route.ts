import { apiSuccess, apiNotFound } from "@/lib/api-response";
import prisma from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  if (!token) {
    return apiNotFound("Token inválido");
  }

  const project = await prisma.project.findUnique({
    where: { publicToken: token },
    include: {
      workspace: {
        include: {
          settings: true,
        }
      },
      // Para la vista pública, tal vez traigamos las tareas completadas recientemente
      // pero las limitaremos para no exponer de más.
    }
  });

  if (!project) {
    return apiNotFound("Portal no encontrado o enlace revocado.");
  }

  // Traer unas cuantas tareas recientes (Done o similares) para el resumen
  const recentTasks = await prisma.task.findMany({
    where: { projectId: project.id, status: "Done" },
    orderBy: { updatedAt: "desc" },
    take: 5,
    select: {
      id: true,
      title: true,
      status: true,
      updatedAt: true,
    }
  });

  // Estadísticas básicas
  const totalTasks = await prisma.task.count({ where: { projectId: project.id } });
  const completedTasks = await prisma.task.count({ where: { projectId: project.id, status: "Done" } });

  // Solo exponer datos seguros
  const safeProject = {
    id: project.id,
    name: project.name,
    client: project.client,
    status: project.status,
    dateStart: project.dateStart,
    dateEnd: project.dateEnd,
    workspace: {
      name: project.workspace.name,
      branding: project.workspace.settings?.branding || {},
    },
    stats: {
      totalTasks,
      completedTasks,
      progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    },
    recentTasks
  };

  return apiSuccess(safeProject);
}
