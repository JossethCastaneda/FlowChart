import { NextRequest } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess } from "@/lib/api-response";
import prisma from "@/lib/prisma";

/**
 * GET /api/publisher/library
 *
 * Lista los MediaAsset del workspace para la pestaña Biblioteca. "usado" se
 * calcula comparando MediaAsset.url contra los mediaUrls ya usados en
 * ScheduledPost/DraftPost — no hay (ni hace falta) un campo de schema para
 * esto.
 *
 * TODO(producto): STORAGE_QUOTA_BYTES es una constante fija de placeholder.
 * No existe un concepto de cuota de almacenamiento por workspace en el
 * schema — si se necesita una cuota real por plan, es una decisión de
 * producto aparte, no algo para inventar aquí.
 */
const STORAGE_QUOTA_BYTES = 50 * 1024 * 1024 * 1024; // 50 GB

export const GET = withWorkspace(async (req: NextRequest, ctx) => {
  const { searchParams } = new URL(req.url);
  const kind = searchParams.get("kind"); // "image" | "video" | null
  const unusedOnly = searchParams.get("unused") === "true";

  const [assets, posts, drafts] = await Promise.all([
    prisma.mediaAsset.findMany({
      where: { workspaceId: ctx.workspaceId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.scheduledPost.findMany({
      where: { workspaceId: ctx.workspaceId },
      select: { mediaUrls: true, mediaUrl: true },
    }),
    prisma.draftPost.findMany({
      where: { workspaceId: ctx.workspaceId },
      select: { baseMediaUrls: true },
    }),
  ]);

  const usedUrls = new Set<string>();
  for (const post of posts) {
    for (const url of post.mediaUrls) usedUrls.add(url);
    if (post.mediaUrl) usedUrls.add(post.mediaUrl);
  }
  for (const draft of drafts) {
    for (const url of draft.baseMediaUrls) usedUrls.add(url);
  }

  let items = assets.map((asset) => ({
    ...asset,
    kind: asset.mimeType.startsWith("video/") ? ("video" as const) : ("image" as const),
    used: usedUrls.has(asset.url),
  }));

  const totalCount = items.length;
  const totalBytes = items.reduce((sum, a) => sum + a.size, 0);

  if (kind === "image" || kind === "video") {
    items = items.filter((a) => a.kind === kind);
  }
  if (unusedOnly) {
    items = items.filter((a) => !a.used);
  }

  return apiSuccess({
    assets: items,
    storage: {
      fileCount: totalCount,
      usedBytes: totalBytes,
      quotaBytes: STORAGE_QUOTA_BYTES,
    },
  });
});
