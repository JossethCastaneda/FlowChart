import { sleep } from "workflow";
import { publishSinglePost } from "@/lib/publisher/publish-single-post";

/**
 * Workflow duradero para publicar posts en redes sociales (reemplazo de QStash).
 * Duerme hasta la hora programada y luego ejecuta la publicación con reintentos automáticos.
 */
export async function publishPostWorkflow(postId: string, delaySeconds: number) {
  "use workflow";

  // Dormimos hasta la hora de publicación programada
  if (delaySeconds > 0) {
    await sleep(`${delaySeconds}s`);
  }

  // Ejecutamos la publicación como un "step" separado
  // Si falla (por caída de API de FB/IG), Vercel Workflow reintentará automáticamente
  const result = await executePublishStep(postId);
  return result;
}

/**
 * Step que envuelve la lógica real de publicación.
 * Al estar marcado con "use step", el SDK se encarga de aislarlo y manejar sus reintentos.
 */
async function executePublishStep(postId: string) {
  "use step";
  const result = await publishSinglePost(postId);
  
  if (result.status === "Failed") {
    // Lanzar error hace que Workflow lo reintente
    throw new Error(`Publicación fallida: ${result.error}`);
  }
  
  return result;
}
