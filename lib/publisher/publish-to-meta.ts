import type { ScheduledPost } from "@prisma/client";
import { metaGetAll } from "@/lib/server-auth";
import { mapMetaError } from "@/lib/meta-errors";

/**
 * LÃ³gica COMPARTIDA de publicaciÃ³n a Meta (Facebook Page / Instagram).
 *
 * Antes existÃ­an dos implementaciones divergentes: el worker de QStash
 * (`/api/jobs/publish`, posts programados) y la publicaciÃ³n inmediata
 * (`/api/publisher/publish`). El worker estaba mÃ¡s limitado (ignoraba
 * `contentByPlatform`, data: URLs, paginaciÃ³n de pÃ¡ginas y usaba un polling de
 * video mÃ¡s corto), asÃ­ que un post programado se publicaba distinto que uno
 * manual. Este mÃ³dulo unifica ambas en una sola funciÃ³n probada.
 *
 * Cada ruta resuelve el access token a su manera (el worker usa el token de
 * workspace; la ruta interactiva usa el de la sesiÃ³n) y lo pasa aquÃ­.
 */

const META_VERSION = process.env.META_API_VERSION || "v25.0";

/**
 * - `now`: publica YA en Facebook e Instagram (worker de QStash, y publicaciÃ³n
 *   manual inmediata).
 * - `fb_scheduled`: usa la programaciÃ³n nativa de Meta en Facebook
 *   (`scheduled_publish_time`) y OMITE Instagram (la Graph API no permite
 *   programar IG). Requiere `post.scheduledAt`.
 */
export type PublishMode = "now" | "fb_scheduled";

export interface PublishToMetaResult {
  externalIds: Record<string, string>;
  errors: string[];
  targetPage: { id: string; name: string } | null;
}

/**
 * Convierte una data: URL en base64 a un Buffer para subida multipart.
 * Devuelve null para URLs https:// normales (se publican por URL).
 */
export function resolveMediaToBuffer(
  mediaUrl: string
): { buffer: Buffer; contentType: string; filename: string } | null {
  if (mediaUrl.startsWith("data:")) {
    const match = mediaUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      const contentType = match[1];
      const buffer = Buffer.from(match[2], "base64");
      const ext =
        contentType.split("/")[1] === "jpeg"
          ? "jpg"
          : contentType.split("/")[1] || "jpg";
      return { buffer, contentType, filename: `upload.${ext}` };
    }
  }
  return null;
}

/** Detecta si una URL apunta a un video por extensiÃ³n, con fallback a HEAD. */
export async function checkIfVideo(url: string): Promise<boolean> {
  if (/\.(mp4|mov|avi|wmv|webm)(?:[?#].*)?$/i.test(url)) return true;
  if (/\.(jpe?g|png|gif|webp|heic)(?:[?#].*)?$/i.test(url)) return false;
  try {
    const res = await fetch(url, { method: "HEAD" });
    const contentType = res.headers.get("content-type") || "";
    return contentType.startsWith("video/");
  } catch {
    return false;
  }
}

/**
 * Publica un `ScheduledPost` en Meta. No toca la base de datos: devuelve los
 * `externalIds` obtenidos, los `errors` acumulados y la pÃ¡gina destino para que
 * el caller persista el resultado segÃºn su flujo (worker vs interactivo).
 */
export async function publishPostToMeta(params: {
  post: ScheduledPost;
  accessToken: string;
  mode: PublishMode;
  isDirectInstagram?: boolean;
  directIgUserId?: string;
}): Promise<PublishToMetaResult> {
  const { post, accessToken, mode, isDirectInstagram, directIgUserId } = params;

  // Partimos de los externalIds ya existentes para que un reintento NO vuelva a
  // publicar un canal que ya saliÃ³ bien (idempotencia por canal).
  const externalIds: Record<string, string> = {
    ...((post.externalIds as Record<string, string>) || {}),
  };
  const errors: string[] = [];

  // SEGURIDAD DE DATOS: esta funciÃ³n publica al feed/media estÃ¡ndar. NO implementa
  // los flujos de Reels ni Stories (video_reels / *_stories / media_type=STORIES).
  // Sin este guard, un reel/story PROGRAMADO se publicaba como post permanente de
  // feed (un story deberÃ­a durar 24h). Preferimos fallar claro a corromper el post.
  if (post.type === "reel" || post.type === "story") {
    errors.push(
      `La publicaciÃ³n programada de ${post.type === "reel" ? "reels" : "historias"} aÃºn no estÃ¡ soportada. PublÃ­calo de forma inmediata desde el editor.`
    );
    return { externalIds, errors, targetPage: null };
  }

  // â”€â”€ PÃ¡ginas (todas, paginadas) â”€â”€
  let targetPage = null;
  let pageToken = "";
  let pageId = "";
  let igUserId = directIgUserId;

  if (!isDirectInstagram) {
    const initialPagesUrl = `https://graph.facebook.com/${META_VERSION}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&limit=100`;
    const { data: pages, error: pagesError } = await metaGetAll(
      initialPagesUrl,
      accessToken
    );

    if (pagesError) {
      errors.push(`Meta: ${pagesError}`);
      return { externalIds, errors, targetPage: null };
    }
    if (pages.length === 0) {
      errors.push("No se encontraron pÃ¡ginas de Facebook. Verifica permisos.");
      return { externalIds, errors, targetPage: null };
    }

    // â”€â”€ PÃ¡gina destino: por id, luego por nombre â”€â”€
    if (post.pageId) {
      targetPage = pages.find((p: any) => p.id === post.pageId) || null;
    } else if (post.pageName) {
      targetPage = pages.find((p: any) => p.name === post.pageName) || null;
    }

    // Fallback to first page only if no page was explicitly selected in the post
    if (!targetPage && !post.pageId && !post.pageName) {
      targetPage = pages[0];
    }

    if (!targetPage) {
      errors.push("La pÃ¡gina seleccionada no estÃ¡ disponible en la cuenta de Facebook conectada.");
      return { externalIds, errors, targetPage: null };
    }

    pageToken = targetPage.access_token;
    pageId = targetPage.id;
    igUserId = targetPage.instagram_business_account?.id;
  } else {
    // Si es Direct IG, creamos un targetPage ficticio para los logs/retorno
    pageToken = accessToken;
    pageId = directIgUserId || "";
    targetPage = { id: pageId, name: post.pageName || "Instagram Direct" };
  }

  // â”€â”€ Contenido por plataforma (Sprint 1.3) â”€â”€
  const cbp = post.contentByPlatform as Record<string, string> | null;
  const fbContent = cbp?.facebook || post.content;
  const igContent = cbp?.instagram || post.content;

  const mediaUrl = post.mediaUrls?.[0] || post.mediaUrl || "";
  const useFbSchedule = mode === "fb_scheduled" && !!post.scheduledAt;

  // â”€â”€ Publicar en Facebook â”€â”€
  if (!isDirectInstagram && post.channels.includes("facebook") && !externalIds.facebook) {
    try {
      if (mediaUrl) {
        const resolved = resolveMediaToBuffer(mediaUrl);

        if (resolved) {
          // Subida binaria multipart (data: URLs)
          const isVideo = resolved.contentType.startsWith("video/");
          const blob = new Blob([resolved.buffer as any], { type: resolved.contentType });

          if (isVideo) {
            // B. Subida de Videos por Fases (Resumable Uploads)
            try {
              // 1. START
              const startForm = new FormData();
              startForm.append("upload_phase", "start");
              startForm.append("file_size", resolved.buffer.length.toString());
              
              const startRes = await fetch(`https://graph-video.facebook.com/${META_VERSION}/${pageId}/videos`, {
                method: "POST", headers: { Authorization: `Bearer ${pageToken}` }, body: startForm
              });
              const startData = await startRes.json();
              if (!startRes.ok) throw new Error(startData?.error?.message || "Error en fase START de video");
              
              const sessionId = startData.upload_session_id;

              // 2. TRANSFER (Asumimos que el buffer cabe en 1 solo chunk por ser data URL en memoria)
              const transferForm = new FormData();
              transferForm.append("upload_phase", "transfer");
              transferForm.append("upload_session_id", sessionId);
              transferForm.append("start_offset", "0");
              transferForm.append("video_file_chunk", blob, resolved.filename);
              
              const transferRes = await fetch(`https://graph-video.facebook.com/${META_VERSION}/${pageId}/videos`, {
                method: "POST", headers: { Authorization: `Bearer ${pageToken}` }, body: transferForm
              });
              if (!transferRes.ok) {
                 const tData = await transferRes.json();
                 throw new Error(tData?.error?.message || "Error en fase TRANSFER de video");
              }

              // 3. FINISH
              const finishForm = new FormData();
              finishForm.append("upload_phase", "finish");
              finishForm.append("upload_session_id", sessionId);
              finishForm.append("description", fbContent);
              if (useFbSchedule) {
                finishForm.append("published", "false");
                finishForm.append("scheduled_publish_time", Math.floor(new Date(post.scheduledAt!).getTime() / 1000).toString());
              }

              const finishRes = await fetch(`https://graph-video.facebook.com/${META_VERSION}/${pageId}/videos`, {
                method: "POST", headers: { Authorization: `Bearer ${pageToken}` }, body: finishForm
              });
              const fbData = await finishRes.json();
              if (finishRes.ok && fbData.success && startData.video_id) {
                 externalIds.facebook = startData.video_id;
              } else if (finishRes.ok && fbData.id) {
                 externalIds.facebook = fbData.id;
              } else {
                 errors.push(`Facebook (Finish): ${fbData?.error?.message || "Error desconocido"}`);
              }

            } catch (err: any) {
              errors.push(`Facebook Video Upload: ${err.message}`);
            }

          } else {
            // FOTOS (One-pass upload normal)
            const form = new FormData();
            if (useFbSchedule) {
              form.append("published", "false");
              form.append("scheduled_publish_time", Math.floor(new Date(post.scheduledAt!).getTime() / 1000).toString());
            }
            form.append("message", fbContent);
            form.append("source", blob, resolved.filename);

            const fbRes = await fetch(
              `https://graph.facebook.com/${META_VERSION}/${pageId}/photos`,
              { method: "POST", headers: { Authorization: `Bearer ${pageToken}` }, body: form }
            );
            const fbData = await fbRes.json();
            if (fbRes.ok && fbData.id) externalIds.facebook = fbData.id;
            else errors.push(`Facebook: ${fbData?.error?.message || "Error desconocido"}`);
          }
        } else {
          // Subida por URL (https://)
          const isVideo = await checkIfVideo(mediaUrl);
          const endpoint = isVideo ? "videos" : "photos";
          const domain = isVideo ? "graph-video.facebook.com" : "graph.facebook.com";

          const payload: any = {};
          if (useFbSchedule) {
            payload.published = false;
            payload.scheduled_publish_time = Math.floor(
              new Date(post.scheduledAt!).getTime() / 1000
            );
          }
          if (isVideo) {
            payload.file_url = mediaUrl;
            payload.description = fbContent;
          } else {
            payload.url = mediaUrl;
            payload.message = fbContent;
          }

          const fbRes = await fetch(
            `https://${domain}/${META_VERSION}/${pageId}/${endpoint}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${pageToken}` },
              body: JSON.stringify(payload),
            }
          );
          const fbData = await fbRes.json();
          if (fbRes.ok && fbData.id) externalIds.facebook = fbData.id;
          else errors.push(`Facebook: ${mapMetaError(fbData?.error).user_message}`);
        }
      } else {
        // Solo texto
        const payload: any = { message: fbContent };
        if (useFbSchedule) {
          payload.published = false;
          payload.scheduled_publish_time = Math.floor(
            new Date(post.scheduledAt!).getTime() / 1000
          );
        }
        const fbRes = await fetch(
          `https://graph.facebook.com/${META_VERSION}/${pageId}/feed`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${pageToken}` },
            body: JSON.stringify(payload),
          }
        );
        const fbData = await fbRes.json();
        if (fbRes.ok && fbData.id) externalIds.facebook = fbData.id;
        else errors.push(`Facebook: ${mapMetaError(fbData?.error).user_message}`);
      }
    } catch (err: any) {
      errors.push(`Facebook: ${err.message}`);
    }
  }

  // â”€â”€ Publicar en Instagram (solo modo inmediato; IG no soporta programaciÃ³n) â”€â”€
  if (
    mode === "now" &&
    post.channels.includes("instagram") &&
    igUserId &&
    !externalIds.instagram
  ) {
    try {
      const allMedia = post.mediaUrls?.length
        ? post.mediaUrls
        : post.mediaUrl
        ? [post.mediaUrl]
        : [];

      if (allMedia.length === 0) {
        errors.push("Instagram: Se requiere al menos una imagen o video para publicar");
      } else {
        // IG REQUIERE URL pÃºblica: para data: URLs subimos antes a Facebook como
        // foto/video no publicado y usamos esa URL.
        let igMediaUrl = allMedia[0];
        const resolved = resolveMediaToBuffer(igMediaUrl);

        if (resolved) {
          const isVideo = resolved.contentType.startsWith("video/");
          const endpoint = isVideo ? "videos" : "photos";
          const domain = isVideo ? "graph-video.facebook.com" : "graph.facebook.com";

          const form = new FormData();
          form.append("published", "false");
          if (isVideo) form.append("description", "instagram_video_temp");
          const blob = new Blob([resolved.buffer as any], { type: resolved.contentType });
          form.append("source", blob, resolved.filename);

          try {
            const uploadRes = await fetch(
              `https://${domain}/${META_VERSION}/${pageId}/${endpoint}`,
              { method: "POST", headers: { Authorization: `Bearer ${pageToken}` }, body: form }
            );
            const uploadData = await uploadRes.json();

            if (uploadRes.ok && uploadData.id) {
              let bestMedia = null;
              const maxRetries = isVideo ? 6 : 1;
              for (let i = 0; i < maxRetries; i++) {
                const fields = isVideo ? "source" : "images";
                const photoRes = await fetch(
                  `https://graph.facebook.com/${META_VERSION}/${uploadData.id}?fields=${fields}`,
                  { headers: { Authorization: `Bearer ${pageToken}` } }
                );
                const photoData = await photoRes.json();
                if (isVideo && photoData?.source) {
                  bestMedia = photoData.source;
                  break;
                } else if (!isVideo && photoData?.images?.[0]?.source) {
                  bestMedia = photoData.images[0].source;
                  break;
                }
                if (isVideo && i < maxRetries - 1) {
                  await new Promise((r) => setTimeout(r, 5000));
                }
              }
              if (bestMedia) igMediaUrl = bestMedia;
              else errors.push("Instagram: No se pudo obtener URL pÃºblica del contenido subido");
            } else {
              errors.push(`Instagram pre-upload: ${uploadData?.error?.message || "Error"}`);
            }
          } catch (err: any) {
            errors.push(`Instagram: Error subiendo archivo (pre-upload): ${err.message}`);
          }
        }

        if (!errors.some((e) => e.startsWith("Instagram"))) {
          if (allMedia.length === 1) {
            // â”€â”€ Media Ãºnica â”€â”€
            const isVideo = await checkIfVideo(igMediaUrl);
            const containerBody: any = { caption: igContent };
            if (isVideo) {
              containerBody.media_type = "VIDEO";
              containerBody.video_url = igMediaUrl;
            } else {
              containerBody.image_url = igMediaUrl;
            }

            const containerRes = await fetch(
              `https://graph.facebook.com/${META_VERSION}/${igUserId}/media`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${pageToken}` },
                body: JSON.stringify(containerBody),
              }
            );
            const containerData = await containerRes.json();

            if (!containerRes.ok || !containerData.id) {
              errors.push(`Instagram: ${containerData?.error?.message || "Error creando container"}`);
            } else if (isVideo) {
              // Polling hasta que el video estÃ© listo (10 Ã— 5s = 50s)
              let isReady = false;
              for (let i = 0; i < 10; i++) {
                const statusRes = await fetch(
                  `https://graph.facebook.com/${META_VERSION}/${containerData.id}?fields=status_code`,
                  { headers: { Authorization: `Bearer ${pageToken}` } }
                );
                const statusData = await statusRes.json();
                if (statusData?.status_code === "FINISHED") {
                  isReady = true;
                  break;
                } else if (statusData?.status_code === "ERROR") {
                  errors.push(
                    `Instagram video processing error: ${statusData.status_message || "Unknown error"}`
                  );
                  break;
                }
                await new Promise((r) => setTimeout(r, 5000));
              }

              if (isReady) {
                const publishRes = await fetch(
                  `https://graph.facebook.com/${META_VERSION}/${igUserId}/media_publish`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${pageToken}` },
                    body: JSON.stringify({ creation_id: containerData.id }),
                  }
                );
                const publishData = await publishRes.json();
                if (publishRes.ok && publishData.id) externalIds.instagram = publishData.id;
                else errors.push(`Instagram video publish error: ${publishData?.error?.message || "Error"}`);
              } else if (!errors.some((e) => e.includes("Instagram video"))) {
                errors.push(
                  "Instagram: El video tardÃ³ demasiado en procesarse. Es posible que se publique en unos minutos."
                );
              }
            } else {
              // Imagen: publicar directo
              const publishRes = await fetch(
                `https://graph.facebook.com/${META_VERSION}/${igUserId}/media_publish`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${pageToken}` },
                  body: JSON.stringify({ creation_id: containerData.id }),
                }
              );
              const publishData = await publishRes.json();
              if (publishRes.ok && publishData.id) externalIds.instagram = publishData.id;
              else errors.push(`Instagram: ${publishData?.error?.message || "Error al publicar"}`);
            }
          } else {
            // â”€â”€ Carousel (2-10) â”€â”€
            const childIds: string[] = [];
            for (const mUrl of allMedia.slice(0, 10)) {
              const isVideo = await checkIfVideo(mUrl);
              const childBody: any = { is_carousel_item: true };
              if (isVideo) {
                childBody.media_type = "VIDEO";
                childBody.video_url = mUrl;
              } else {
                childBody.image_url = mUrl;
              }
              const childRes = await fetch(
                `https://graph.facebook.com/${META_VERSION}/${igUserId}/media`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${pageToken}` },
                  body: JSON.stringify(childBody),
                }
              );
              const childData = await childRes.json();
              if (childRes.ok && childData.id) childIds.push(childData.id);
              else errors.push(`Instagram carousel item: ${childData?.error?.message || "Error"}`);
            }

            if (childIds.length >= 2) {
              await new Promise((r) => setTimeout(r, 2000));
              const carouselRes = await fetch(
                `https://graph.facebook.com/${META_VERSION}/${igUserId}/media`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${pageToken}` },
                  body: JSON.stringify({
                    media_type: "CAROUSEL",
                    children: childIds.join(","),
                    caption: igContent,
                  }),
                }
              );
              const carouselData = await carouselRes.json();

              if (carouselRes.ok && carouselData.id) {
                await new Promise((r) => setTimeout(r, 1000));
                const publishRes = await fetch(
                  `https://graph.facebook.com/${META_VERSION}/${igUserId}/media_publish`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${pageToken}` },
                    body: JSON.stringify({ creation_id: carouselData.id }),
                  }
                );
                const publishData = await publishRes.json();
                if (publishRes.ok && publishData.id) externalIds.instagram = publishData.id;
                else errors.push(`Instagram carousel publish: ${publishData?.error?.message || "Error"}`);
              } else {
                errors.push(`Instagram carousel: ${carouselData?.error?.message || "Error creando carousel"}`);
              }
            } else if (childIds.length === 1) {
              errors.push("Instagram: Se necesitan al menos 2 imÃ¡genes para un carousel");
            } else {
              errors.push("Instagram: No se pudieron crear los items del carousel");
            }
          }
        }
      }
    } catch (err: any) {
      errors.push(`Instagram: ${err.message}`);
    }
  }

  return {
    externalIds,
    errors,
    targetPage: { id: targetPage.id, name: targetPage.name },
  };
}

