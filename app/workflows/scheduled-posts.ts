import { sleep } from "workflow";

// STEP FUNCTION: Has full Node.js access — lee el post de la DB
export async function getScheduledPostForPublish(postId: string) {
  "use step";
  const { default: prisma } = await import("@/lib/prisma");
  return await prisma.scheduledPost.findUnique({
    where: { id: postId },
  });
}

/**
 * publishScheduledPost
 *
 * Workflow durable: espera hasta la hora programada y luego
 * llama al endpoint interno de publicación con el postId específico.
 */
export async function publishScheduledPost(args: {
  postId: string;
  workspaceId: string;
  scheduledAt: Date;
}) {
  "use workflow";

  const { postId, scheduledAt } = args;

  // 1. Esperar hasta la hora programada (durable sleep)
  const targetTime = new Date(scheduledAt).getTime();
  const now = Date.now();
  const msToWait = targetTime - now;

  if (msToWait > 0) {
    await sleep(`${msToWait}ms`);
  }

  // 2. Verificar que el post todavía existe y sigue pendiente
  const post = await getScheduledPostForPublish(postId);

  if (!post) {
    throw new Error(`Scheduled post ${postId} not found.`);
  }

  if (post.status === "Published" || post.status === "Failed" || post.status === "Draft") {
    console.log(`Post ${postId} skipped (status: ${post.status})`);
    return { skipped: true, reason: `Post already ${post.status}` };
  }

  // 3. Llamar al endpoint interno del cron que maneja este postId específico
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://sodare.xyz";

  const publishRes = await fetch(`${baseUrl}/api/cron/publish-scheduled`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.CRON_SECRET || ""}`,
    },
    body: JSON.stringify({ postId }),
  });

  if (!publishRes.ok) {
    const errBody = await publishRes.json().catch(() => ({}));
    throw new Error(
      `Failed to execute publishing (${publishRes.status}): ${errBody?.error || "Unknown error"}`
    );
  }

  return { success: true };
}
