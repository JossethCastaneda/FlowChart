import { sleep } from "workflow";

const META_VERSION = process.env.META_API_VERSION || "v22.0";

// STEP FUNCTION: Has full Node.js access
export async function markInstagramPostPublished(args: {
  postId: string;
  externalId: string;
  pageName: string;
  pageId: string;
}) {
  "use step";
  const { postId, externalId, pageName, pageId } = args;
  const { default: prisma } = await import("@/lib/prisma");
  await prisma.scheduledPost.update({
    where: { id: postId },
    data: {
      status: "Published",
      publishedAt: new Date(),
      externalIds: { instagram: externalId },
      pageName,
      pageId,
    },
  });
}

// STEP FUNCTION: Has full Node.js access
export async function markInstagramPostFailed(args: {
  postId: string;
  error: string;
}) {
  "use step";
  const { postId, error } = args;
  const { default: prisma } = await import("@/lib/prisma");
  await prisma.scheduledPost.update({
    where: { id: postId },
    data: { status: "Failed", error },
  });
}

/**
 * publishInstagramVideo
 *
 * Recibe un containerId ya creado por /api/publisher/publish,
 * hace polling durable hasta que Meta procese el video, y luego lo publica.
 */
export async function publishInstagramVideo(args: {
  postId: string;
  containerId: string;   // El container ya fue creado antes de llamar este workflow
  igUserId: string;
  pageToken: string;
  pageName: string;
  pageId: string;
}) {
  "use workflow";

  const { postId, containerId, igUserId, pageToken, pageName, pageId } = args;

  // Esperar que Meta procese el video usando durable sleep.
  // Vercel Workflow permite bucles de espera seguros sin timeout.
  let ready = false;

  for (let i = 0; i < 24; i++) {
    await sleep("10s"); // 24 × 10s = máximo 4 minutos de espera

    const statusRes = await fetch(
      `https://graph.facebook.com/${META_VERSION}/${containerId}?fields=status_code`,
      { headers: { Authorization: `Bearer ${pageToken}` } }
    );
    const statusData = await statusRes.json();

    if (statusData.status_code === "FINISHED") {
      ready = true;
      break;
    }
    if (statusData.status_code === "ERROR") {
      await markInstagramPostFailed({
        postId,
        error: "Instagram: Error procesando video (Meta devolvió ERROR).",
      });
      throw new Error("Instagram: Error procesando video devuelto por Meta.");
    }
  }

  if (!ready) {
    await markInstagramPostFailed({
      postId,
      error: "Instagram: El video tardó demasiado en procesarse (Timeout > 4 min).",
    });
    throw new Error("Instagram: Timeout esperando procesamiento de video.");
  }

  // Publicar el container ya procesado
  const publishRes = await fetch(
    `https://graph.facebook.com/${META_VERSION}/${igUserId}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${pageToken}` },
      body: JSON.stringify({ creation_id: containerId }),
    }
  );
  const publishData = await publishRes.json();

  if (publishRes.ok && publishData.id) {
    await markInstagramPostPublished({
      postId,
      externalId: publishData.id,
      pageName,
      pageId,
    });
    return { success: true, externalId: publishData.id };
  } else {
    const errMsg = `Instagram: ${publishData?.error?.message || "Error al publicar final"}`;
    await markInstagramPostFailed({ postId, error: errMsg });
    throw new Error(errMsg);
  }
}
