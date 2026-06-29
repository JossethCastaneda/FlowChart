import { sleep } from "workflow";
import { checkSLAWarnings } from "@/lib/notifications";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

/**
 * Workflow duradero para monitorear el SLA de una tarea (SLA Engine).
 * Se lanza cuando se crea una tarea con SLA.
 * Duerme la cantidad de segundos especificada y luego verifica
 * si la tarea sigue abierta. Si es así, lanza las notificaciones de escalamiento.
 */
export async function slaEngineWorkflow(
  taskId: string,
  workspaceId: string,
  delaySeconds: number,
  expectedStatus: string[] = ["To Do", "In Progress", "Blocked"]
) {
  "use workflow";

  if (delaySeconds > 0) {
    await sleep(`${delaySeconds}s`);
  }

  // Despierta y ejecuta la revisión.
  const result = await executeSLAStep(workspaceId, taskId, expectedStatus);
  return result;
}

async function executeSLAStep(workspaceId: string, taskId: string, expectedStatus: string[]) {
  "use step";
  
  const task = await prisma.task.findUnique({
    where: { id: taskId, workspaceId }
  });

  if (!task) {
    return { status: "not_found" };
  }

  // Si la tarea sigue en un estado no resuelto, disparamos alertas
  if (expectedStatus.includes(task.status)) {
    // Por simplicidad, llamamos al checker global, pero aquí podría 
    // ir lógica de escalamiento específico (enviar SMS al lead, etc).
    await checkSLAWarnings(workspaceId);
    logger.info(`[SLA Engine] SLA violado o en riesgo para tarea ${taskId}, alertas enviadas.`);
    return { status: "escalated" };
  }

  logger.info(`[SLA Engine] SLA verificado para tarea ${taskId} - Resuelta a tiempo.`);
  return { status: "resolved_on_time" };
}
