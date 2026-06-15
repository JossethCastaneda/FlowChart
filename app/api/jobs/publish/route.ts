import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { decryptToken } from "@/lib/encryption";
import { verifyQstashRequest } from "@/lib/qstash";
import { publishPostToMeta } from "@/lib/publisher/publish-to-meta";

// El polling de video de IG puede tardar hasta ~50s; dejamos margen sobre 60s.
export const maxDuration = 120;

// Una entrega QStash atascada (crash/timeout sin liberar el lock) se reclama
// pasados estos ms, para que un reintento pueda retomarla.
const STALE_LOCK_MS = 5 * 60 * 1000;

/**
 * POST /api/jobs/publish
 *
 * Invocado por QStash para publicar un post programado concreto por su id.
 * Body: { publishJobId: string }
 *
 * Autenticación: firma `Upstash-Signature` (preferida) o, como fallback, el
 * bearer `PUBLISH_WORKER_SECRET` que QStash reenvía. Ver lib/qstash.ts.
 */
export async function POST(req: NextRequest) {
  // El body crudo se necesita tanto para verificar la firma como para parsearlo.
  const rawBody = await req.text();

  const auth = await verifyQstashRequest(req, rawBody);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized worker" }, { status: 401 });
  }

  try {
    const body = rawBody ? JSON.parse(rawBody) : {};
    const { publishJobId } = body;
    if (!publishJobId) {
      return NextResponse.json({ error: "publishJobId is required" }, { status: 400 });
    }

    const result = await publishSinglePost(publishJobId);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[WORKER POST] Error:", err);
    return NextResponse.json({ error: err?.message || "Error" }, { status: 500 });
  }
}

/**
 * Publica un único post programado. Idempotente ante la entrega "at-least-once"
 * de QStash: reclama el post de forma atómica (Scheduled/Failed → Publishing)
 * antes de tocar Meta; una segunda entrega concurrente no pasa el claim.
 * Un lock "Publishing" viejo (crash/timeout) se reclama tras STALE_LOCK_MS.
 */
async function publishSinglePost(
  postId: string
): Promise<{ id: string; status: string; error?: string }> {
  const post = await prisma.scheduledPost.findUnique({ where: { id: postId } });

  if (!post) {
    return { id: postId, status: "Failed", error: "Post not found" };
  }

  if (post.status === "Published") {
    return { id: postId, status: "Published" };
  }

  // ── Claim atómico (anti doble-publicación) ──
  const staleBefore = new Date(Date.now() - STALE_LOCK_MS);
  const claim = await prisma.scheduledPost.updateMany({
    where: {
      id: postId,
      OR: [
        { status: { in: ["Scheduled", "Failed"] } },
        { status: "Publishing", updatedAt: { lt: staleBefore } },
      ],
    },
    data: { status: "Publishing" },
  });

  if (claim.count === 0) {
    // Otra entrega ya lo tomó o ya se publicó; no republicamos.
    const current = await prisma.scheduledPost.findUnique({ where: { id: postId } });
    return {
      id: postId,
      status: current?.status ?? "Unknown",
      error: "Skipped: ya en proceso o publicado",
    };
  }

  try {
    // Token a nivel de workspace (el worker no tiene sesión de usuario).
    const integration = await prisma.integration.findUnique({
      where: {
        workspaceId_provider_userId: {
          workspaceId: post.workspaceId,
          provider: "meta",
          userId: "workspace",
        },
      },
    });

    if (!integration?.connected || !(integration.credentials as any)?.accessToken) {
      await prisma.scheduledPost.update({
        where: { id: post.id },
        data: { status: "Failed", error: "No Meta token found for workspace" },
      });
      return { id: post.id, status: "Failed", error: "No token" };
    }

    const accessToken = decryptToken((integration.credentials as any).accessToken);
    if (!accessToken || accessToken.startsWith("enc:")) {
      await prisma.scheduledPost.update({
        where: { id: post.id },
        data: { status: "Failed", error: "Meta token could not be decrypted" },
      });
      return { id: post.id, status: "Failed", error: "Invalid token" };
    }

    // QStash ya esperó hasta la hora programada → publicamos YA (modo "now").
    const { externalIds, errors, targetPage } = await publishPostToMeta({
      post,
      accessToken,
      mode: "now",
    });

    const hasSuccess = Object.keys(externalIds).length > 0;
    await prisma.scheduledPost.update({
      where: { id: post.id },
      data: {
        status: hasSuccess ? "Published" : "Failed",
        publishedAt: hasSuccess ? new Date() : null,
        externalIds,
        pageName: targetPage?.name ?? post.pageName,
        pageId: targetPage?.id ?? post.pageId,
        error: errors.length > 0 ? errors.join(" | ") : null,
      },
    });

    return {
      id: post.id,
      status: hasSuccess ? "Published" : "Failed",
      error: errors.length > 0 ? errors.join(" | ") : undefined,
    };
  } catch (postErr: any) {
    // Liberamos el lock dejándolo en Failed para que QStash pueda reintentar.
    await prisma.scheduledPost.update({
      where: { id: post.id },
      data: { status: "Failed", error: postErr.message },
    });
    return { id: post.id, status: "Failed", error: postErr.message };
  }
}
