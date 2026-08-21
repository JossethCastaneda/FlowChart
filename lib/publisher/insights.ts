import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import { getMetaAccessToken, metaFetch, META_API_VERSION } from "@/lib/server-auth";
import { logger } from "@/lib/logger";

/**
 * Métricas reales de una publicación ya enviada (Historial). No existía
 * ninguna integración de insights a nivel de post orgánico en el repo — solo
 * insights de campañas pagadas (app/api/meta/insights). Esto es trabajo
 * nuevo, no un "activar una bandera".
 *
 * IMPORTANTE — verificar antes de confiar ciegamente en el mapeo de métricas:
 * los nombres exactos de `metric` en Graph API cambian entre versiones y
 * Meta los ha renombrado más de una vez (p. ej. "impressions" fue
 * deprecado/consolidado para varios tipos de media de Instagram). Los
 * nombres usados aquí son los estables y documentados al momento de escribir
 * esto, pero deben probarse contra al menos una cuenta Meta real conectada
 * antes de confiar en los números que devuelven — no se puede validar esto
 * en un entorno sin credenciales reales.
 */

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h — no golpear Graph API en cada expand

export interface PostInsights {
  reach: number | null;
  interactions: number | null;
  engagementPct: number | null;
}

export type InsightsResult =
  | { available: true; insights: PostInsights; cachedAt: string }
  | { available: false; reason: string };

/** Post mínimo necesario para resolver insights — evita acoplar a todo el modelo Prisma. */
interface InsightablePost {
  id: string;
  channels: string[];
  status: string;
  externalIds: Record<string, string> | null;
}

async function fetchFacebookPostInsights(postId: string, token: string): Promise<PostInsights | null> {
  // reach: metric de insights, estable desde hace años.
  // interacciones: se leen como campos del propio post (reactions/comments/shares),
  // no vía insights — son conteos directos del objeto, menos propensos a romperse
  // entre versiones de la API que los nombres de `metric`.
  const [insightsRes, fieldsRes] = await Promise.all([
    metaFetch(
      `https://graph.facebook.com/${META_API_VERSION}/${postId}/insights?metric=post_impressions_unique`,
      token
    ),
    metaFetch(
      `https://graph.facebook.com/${META_API_VERSION}/${postId}?fields=reactions.summary(true).limit(0),comments.summary(true).limit(0),shares`,
      token
    ),
  ]);
  if (!insightsRes.ok && !fieldsRes.ok) return null;

  let reach: number | null = null;
  if (insightsRes.ok) {
    const json = await insightsRes.json();
    const entry = json.data?.find((d: { name: string }) => d.name === "post_impressions_unique");
    reach = entry?.values?.[0]?.value ?? null;
  }

  let interactions: number | null = null;
  if (fieldsRes.ok) {
    const json = await fieldsRes.json();
    const reactions = json.reactions?.summary?.total_count ?? 0;
    const comments = json.comments?.summary?.total_count ?? 0;
    const shares = json.shares?.count ?? 0;
    interactions = reactions + comments + shares;
  }

  const engagementPct = reach && interactions !== null && reach > 0 ? (interactions / reach) * 100 : null;
  return { reach, interactions, engagementPct };
}

async function fetchInstagramMediaInsights(mediaId: string, token: string): Promise<PostInsights | null> {
  // `reach` es el único metric consistente entre todos los tipos de media de IG
  // (feed/reel/carousel). Para interacciones se usan like_count/comments_count
  // del objeto media directamente (campos, no insights) por la misma razón que
  // en Facebook: más estables que los nombres de `metric` de insights.
  const [insightsRes, fieldsRes] = await Promise.all([
    metaFetch(`https://graph.facebook.com/${META_API_VERSION}/${mediaId}/insights?metric=reach`, token),
    metaFetch(`https://graph.facebook.com/${META_API_VERSION}/${mediaId}?fields=like_count,comments_count`, token),
  ]);
  if (!insightsRes.ok && !fieldsRes.ok) return null;

  let reach: number | null = null;
  if (insightsRes.ok) {
    const json = await insightsRes.json();
    const entry = json.data?.find((d: { name: string }) => d.name === "reach");
    reach = entry?.values?.[0]?.value ?? null;
  }

  let interactions: number | null = null;
  if (fieldsRes.ok) {
    const json = await fieldsRes.json();
    const likes = json.like_count ?? 0;
    const comments = json.comments_count ?? 0;
    interactions = likes + comments;
  }

  const engagementPct = reach && interactions !== null && reach > 0 ? (interactions / reach) * 100 : null;
  return { reach, interactions, engagementPct };
}

/**
 * Obtiene insights de un post publicado, usando caché (MetaAnalyticsCache,
 * endpoint="posts", paramsKey=post.id) con TTL de 6h. Fetch perezoso — se
 * llama solo cuando el usuario expande la fila en Historial, no en cada carga
 * de la tabla.
 */
export async function getOrFetchPostInsights(
  req: NextRequest,
  workspaceId: string,
  post: InsightablePost
): Promise<InsightsResult> {
  if (post.status !== "Published") {
    return { available: false, reason: "La publicación aún no se ha enviado." };
  }

  const cached = await prisma.metaAnalyticsCache.findUnique({
    where: { workspaceId_endpoint_paramsKey: { workspaceId, endpoint: "posts", paramsKey: post.id } },
  });
  if (cached) {
    const age = Date.now() - cached.updatedAt.getTime();
    if (age < CACHE_TTL_MS) {
      return { available: true, insights: cached.data as unknown as PostInsights, cachedAt: cached.updatedAt.toISOString() };
    }
  }

  const externalIds = post.externalIds || {};
  let insights: PostInsights | null = null;
  let reason = "No hay datos externos para esta publicación.";

  try {
    // Un mismo post puede haberse publicado en Facebook Y en Instagram: se
    // consultan ambas y se agregan (no `else if`, que solo contaba Facebook y
    // subestimaba el alcance real de una publicación cruzada).
    const parts: PostInsights[] = [];
    const failures: string[] = [];

    if (post.channels.includes("facebook") && externalIds.facebook) {
      const token = await getMetaAccessToken(req, "publisher_facebook");
      if (!token) {
        failures.push("la cuenta de Facebook no está conectada o el token expiró");
      } else {
        const fb = await fetchFacebookPostInsights(externalIds.facebook, token);
        if (fb) parts.push(fb);
        else failures.push("Meta no devolvió datos para la publicación de Facebook");
      }
    }

    if (post.channels.includes("instagram") && externalIds.instagram) {
      const token = await getMetaAccessToken(req, "publisher_instagram");
      if (!token) {
        failures.push("la cuenta de Instagram no está conectada o el token expiró");
      } else {
        const ig = await fetchInstagramMediaInsights(externalIds.instagram, token);
        if (ig) parts.push(ig);
        else failures.push("Meta no devolvió datos para la publicación de Instagram");
      }
    }

    if (parts.length > 0) {
      // Suma entre plataformas (práctica estándar en reportería social). El
      // engagement se recalcula sobre los totales, no se promedian porcentajes:
      // promediar tasas de audiencias de distinto tamaño da un número falso.
      const sum = (pick: (p: PostInsights) => number | null) =>
        parts.reduce<number | null>((acc, p) => {
          const v = pick(p);
          if (v === null) return acc;
          return (acc ?? 0) + v;
        }, null);

      const reach = sum((p) => p.reach);
      const interactions = sum((p) => p.interactions);
      insights = {
        reach,
        interactions,
        engagementPct: reach && interactions !== null && reach > 0 ? (interactions / reach) * 100 : null,
      };
    } else if (!post.channels.some((c) => c === "facebook" || c === "instagram")) {
      reason = "Las métricas reales solo están disponibles para Facebook e Instagram por ahora.";
    } else if (failures.length > 0) {
      reason = `No se pudieron obtener métricas: ${failures.join("; ")}.`;
    }
  } catch (error) {
    logger.error("[PUBLISHER] Error obteniendo insights", { postId: post.id, workspaceId, error });
    reason = "Error al consultar Meta Graph API.";
  }

  if (!insights) {
    // No se cachea un fallo — se reintenta en el próximo expand en vez de
    // quedar "atascado" en un error temporal por 6h.
    return { available: false, reason };
  }

  const updated = await prisma.metaAnalyticsCache.upsert({
    where: { workspaceId_endpoint_paramsKey: { workspaceId, endpoint: "posts", paramsKey: post.id } },
    create: { id: randomUUID(), workspaceId, endpoint: "posts", paramsKey: post.id, data: insights as object },
    update: { data: insights as object },
  });

  return { available: true, insights, cachedAt: updated.updatedAt.toISOString() };
}
