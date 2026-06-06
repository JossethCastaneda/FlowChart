import { NextRequest, NextResponse } from "next/server";
import { publishInstagramVideo } from "@/app/workflows/instagram";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";
import prisma from "@/lib/prisma";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { getMetaAccessToken, metaFetch } from "@/lib/server-auth";
import { mapMetaError } from "@/lib/meta-errors";

const META_VERSION = process.env.META_API_VERSION || "v25.0";

/**
 * Converts a base64 data URL into a Buffer for multipart upload.
 * Returns null for regular https:// URLs (use url-based publishing).
 */
function resolveMediaToBuffer(
  mediaUrl: string
): { buffer: Buffer; contentType: string; filename: string } | null {
  if (mediaUrl.startsWith("data:")) {
    const match = mediaUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      const contentType = match[1];
      const buffer = Buffer.from(match[2], "base64");
      const ext = contentType.split("/")[1] === "jpeg" ? "jpg" : (contentType.split("/")[1] || "jpg");
      return { buffer, contentType, filename: `upload.${ext}` };
    }
  }

  // Regular URL — use URL-based publishing
  if (mediaUrl.startsWith("http://") || mediaUrl.startsWith("https://")) {
    return null;
  }

  return null;
}

/**
 * Checks if a URL points to a video by examining the extension,
 * and falls back to a HEAD request if the extension is missing.
 */
async function checkIfVideo(url: string): Promise<boolean> {
  if (/\.(mp4|mov|avi|wmv|webm)(?:[?#].*)?$/i.test(url)) return true;
  if (/\.(jpe?g|png|gif|webp|heic)(?:[?#].*)?$/i.test(url)) return false;
  
  try {
    const res = await fetch(url, { method: "HEAD" });
    const contentType = res.headers.get("content-type") || "";
    return contentType.startsWith("video/");
  } catch (err) {
    return false; // Fallback
  }
}



/**
 * POST /api/publisher/publish
 *
 * Publishes a post to Facebook Page and/or Instagram.
 * Handles both URL-based and binary multipart uploads using axios & form-data.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = await getActiveWorkspaceId(session.user.id);
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace activo" }, { status: 400 });
    }

    const body = await req.json();
    const { postId } = body;

    if (!postId) {
      return NextResponse.json({ error: "postId is required" }, { status: 400 });
    }

    const post = await prisma.scheduledPost.findFirst({
      where: { id: postId, workspaceId },
    });

    if (!post) {
      return NextResponse.json({ error: "Post no encontrado" }, { status: 404 });
    }

    if (post.status === "Published") {
      return NextResponse.json({ error: "Este post ya fue publicado" }, { status: 400 });
    }

    // Try publisher_facebook token first, fallback to meta, then social
    let accessToken = await getMetaAccessToken(req, "publisher_facebook");
    if (!accessToken) accessToken = await getMetaAccessToken(req, "publisher");
    if (!accessToken) accessToken = await getMetaAccessToken(req, "social");
    if (!accessToken) accessToken = await getMetaAccessToken(req);

    if (!accessToken) {
      return NextResponse.json(
        { error: "No hay cuenta de Facebook conectada. Ve al Publisher y conecta tu cuenta de Facebook." },
        { status: 401 }
      );
    }

    // Fetch ALL pages with pagination (user may have 100+)
    let pages: any[] = [];
    let nextPagesUrl: string | null = `https://graph.facebook.com/${META_VERSION}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&limit=100`;
    while (nextPagesUrl) {
      const pagesRes = await metaFetch(nextPagesUrl, accessToken);
      const pagesJson = await pagesRes.json();
      if (pagesJson.error) {
        console.error("[PUBLISHER] Error fetching pages:", JSON.stringify(pagesJson.error));
        break;
      }
      pages = [...pages, ...(pagesJson.data || [])];
      // Strip access_token from paging.next — metaFetch adds Bearer header
      const rawNext = pagesJson.paging?.next || null;
      if (rawNext) {
        try {
          const u = new URL(rawNext);
          u.searchParams.delete("access_token");
          nextPagesUrl = u.toString();
        } catch {
          nextPagesUrl = null;
        }
      } else {
        nextPagesUrl = null;
      }
    }

    if (pages.length === 0) {
      return NextResponse.json(
        { error: "No se encontraron páginas de Facebook. Verifica permisos." },
        { status: 400 }
      );
    }

    let targetPage = pages[0];
    if (post.pageId) {
      const found = pages.find((p: any) => p.id === post.pageId);
      if (found) targetPage = found;
    } else if (post.pageName) {
      const found = pages.find((p: any) => p.name === post.pageName);
      if (found) targetPage = found;
    }

    const pageToken = targetPage.access_token;
    const pageId = targetPage.id;
    const igUserId = targetPage.instagram_business_account?.id;

    // ── Log key state for debugging ──
    console.log("[PUBLISHER] postId:", postId, "channels:", post.channels, "pageId:", pageId, "pageToken present:", !!pageToken, "igUserId:", igUserId || "none");

    const externalIds: Record<string, string> = {};
    const errors: string[] = [];

    // ── Per-platform content (Sprint 1.3) ──
    const cbp = post.contentByPlatform as Record<string, string> | null;
    const fbContent = cbp?.facebook || post.content;
    const igContent = cbp?.instagram || post.content;

    // ── Get media info ──
    const mediaUrl = post.mediaUrls?.[0] || post.mediaUrl || "";

    // ── Publish to Facebook ──
    if (post.channels.includes("facebook")) {
      try {
        if (mediaUrl) {
          // Try to resolve as binary buffer (for data: URLs)
          const resolved = resolveMediaToBuffer(mediaUrl);

          if (resolved) {
            // ── Multipart binary upload via native fetch + FormData ──
            const isVideo = resolved.contentType.startsWith("video/");
            const endpoint = isVideo ? "videos" : "photos";
            const domain = isVideo ? "graph-video.facebook.com" : "graph.facebook.com";
            
            const form = new FormData();
            if (isVideo) {
              form.append("description", fbContent);
            } else {
              form.append("message", fbContent);
            }
            // SECURITY: Token in Authorization header, NOT in form body
            
            const blob = new Blob([resolved.buffer as any], { type: resolved.contentType });
            form.append("source", blob, resolved.filename);

            try {
              const fbRes = await fetch(
                `https://${domain}/${META_VERSION}/${pageId}/${endpoint}`,
                {
                  method: "POST",
                  headers: { Authorization: `Bearer ${pageToken}` },
                  body: form,
                }
              );
              const fbData = await fbRes.json();
              if (fbRes.ok && fbData.id) {
                externalIds.facebook = fbData.id;
              } else {
                errors.push(`Facebook: ${fbData?.error?.message || "Error desconocido"}`);
              }
            } catch (err: any) {
              errors.push(`Facebook: ${err.message}`);
            }
          } else {
            // ── URL-based upload (for https:// URLs) ──
            const isVideo = await checkIfVideo(mediaUrl);
            const endpoint = isVideo ? "videos" : "photos";
            const domain = isVideo ? "graph-video.facebook.com" : "graph.facebook.com";
            
            const payload: any = {};
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
            console.log("[PUBLISHER] FB URL-based upload response:", JSON.stringify(fbData));
            if (fbRes.ok && fbData.id) {
              externalIds.facebook = fbData.id;
            } else {
              const fbErr = `Facebook: ${mapMetaError(fbData?.error).user_message}`;
              console.error("[PUBLISHER] FB error:", fbErr, JSON.stringify(fbData?.error));
              errors.push(fbErr);
            }
          }
        } else {
          // Text-only post
          const fbRes = await fetch(
            `https://graph.facebook.com/${META_VERSION}/${pageId}/feed`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${pageToken}` },
              body: JSON.stringify({ message: fbContent }),
            }
          );
          const fbData = await fbRes.json();
          console.log("[PUBLISHER] FB text-only feed response:", JSON.stringify(fbData));
          if (fbRes.ok && fbData.id) {
            externalIds.facebook = fbData.id;
          } else {
            const fbErr = `Facebook: ${mapMetaError(fbData?.error).user_message}`;
            console.error("[PUBLISHER] FB feed error:", fbErr, JSON.stringify(fbData?.error));
            errors.push(fbErr);
          }
        }
      } catch (err: any) {
        errors.push(`Facebook: ${err.message}`);
      }
    }

    // ── Publish to Instagram ──
    if (post.channels.includes("instagram") && igUserId) {
      try {
        const allMedia = (post.mediaUrls?.length ? post.mediaUrls : (post.mediaUrl ? [post.mediaUrl] : []));
        if (allMedia.length === 0) {
          errors.push("Instagram: Se requiere al menos una imagen o video para publicar");
        } else {
          // Instagram REQUIRES a public URL — for data: URLs, we need to first
          // upload to Facebook as an unpublished photo, then use that URL.
          let igMediaUrl = allMedia[0];
          const resolved = resolveMediaToBuffer(igMediaUrl);

          if (resolved) {
            // Upload to Facebook as unpublished photo/video to get a public URL
            const isVideo = resolved.contentType.startsWith("video/");
            const endpoint = isVideo ? "videos" : "photos";
            const domain = isVideo ? "graph-video.facebook.com" : "graph.facebook.com";
            
            const form = new FormData();
            form.append("published", "false");
            if (isVideo) form.append("description", "instagram_video_temp");
            // SECURITY: Token in Authorization header, NOT in form body
            
            const blob = new Blob([resolved.buffer as any], { type: resolved.contentType });
            form.append("source", blob, resolved.filename);

            try {
              const uploadRes = await fetch(
                `https://${domain}/${META_VERSION}/${pageId}/${endpoint}`,
                {
                  method: "POST",
                  headers: { Authorization: `Bearer ${pageToken}` },
                  body: form,
                }
              );
              const uploadData = await uploadRes.json();
              
              if (uploadRes.ok && uploadData.id) {
                // If it's a video, we might need to wait for processing to get the source URL
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
                    // Wait 5 seconds before retrying
                    await new Promise(r => setTimeout(r, 5000));
                  }
                }
                
                if (bestMedia) {
                  igMediaUrl = bestMedia;
                } else {
                  errors.push("Instagram: No se pudo obtener URL pública del contenido subido");
                }
              } else {
                errors.push(`Instagram pre-upload: ${uploadData?.error?.message || "Error"}`);
              }
            } catch (err: any) {
              errors.push(`Instagram: Error subiendo archivo (pre-upload): ${err.message}`);
            }
          }

          // Now publish to Instagram with the public URL
          if (!errors.some(e => e.startsWith("Instagram"))) {
            if (allMedia.length === 1) {
              // ── Single media post ──
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
              } else {
                if (isVideo) {
                  // El container ya está creado, pasarlo al workflow para el polling durable
                  // El workflow espera hasta que Meta lo procese y lo publica.
                  // Retornamos INMEDIATAMENTE — el workflow se ejecuta en background.
                  try {
                    await publishInstagramVideo({
                      postId,
                      containerId: containerData.id,   // ← Container YA creado
                      igUserId,
                      pageToken,
                      pageName: targetPage.name,
                      pageId: targetPage.id,
                    });

                    // Actualizar FB si se publicó también ahí
                    if (Object.keys(externalIds).length > 0) {
                      await prisma.scheduledPost.update({
                        where: { id: postId },
                        data: {
                          externalIds,
                          publishedAt: new Date(),
                          status: "Published",
                          pageName: targetPage.name,
                          pageId: targetPage.id,
                          error: errors.length > 0 ? errors.join(" | ") : null,
                        },
                      });
                    }

                    return NextResponse.json({
                      success: true,
                      status: "Processing",
                      message: "El video de Instagram se está procesando y publicando en segundo plano.",
                      warnings: errors.length > 0 ? errors : undefined,
                    });
                  } catch (err: any) {
                    errors.push(`Instagram Workflow trigger error: ${err.message}`);
                  }

                } else {
                  // Es imagen, publicar directo:
                  const publishRes = await fetch(
                    `https://graph.facebook.com/${META_VERSION}/${igUserId}/media_publish`,
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${pageToken}` },
                      body: JSON.stringify({ creation_id: containerData.id }),
                    }
                  );
                  const publishData = await publishRes.json();
                  if (publishRes.ok && publishData.id) {
                    externalIds.instagram = publishData.id;
                  } else {
                    errors.push(`Instagram: ${publishData?.error?.message || "Error al publicar"}`);
                  }
                }
              }
            } else {
              // ── Carousel post (2-10 images) ──
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
                if (childRes.ok && childData.id) {
                  childIds.push(childData.id);
                } else {
                  errors.push(`Instagram carousel item: ${childData?.error?.message || "Error"}`);
                }
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
                  if (publishRes.ok && publishData.id) {
                    externalIds.instagram = publishData.id;
                  } else {
                    errors.push(`Instagram carousel publish: ${publishData?.error?.message || "Error"}`);
                  }
                } else {
                  errors.push(`Instagram carousel: ${carouselData?.error?.message || "Error creando carousel"}`);
                }
              } else if (childIds.length === 1) {
                errors.push("Instagram: Se necesitan al menos 2 imágenes para un carousel");
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

    // Update post status
    const hasAnySuccess = Object.keys(externalIds).length > 0;
    const updateData: any = {
      externalIds,
      publishedAt: hasAnySuccess ? new Date() : null,
      status: hasAnySuccess ? "Published" : "Failed",
      error: errors.length > 0 ? errors.join(" | ") : null,
      pageName: targetPage.name,
      pageId: targetPage.id,
    };

    const updated = await prisma.scheduledPost.update({
      where: { id: postId },
      data: updateData,
    });

    if (!hasAnySuccess) {
      return NextResponse.json(
        { error: errors.join(" | "), post: updated },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      post: updated,
      published: externalIds,
      warnings: errors.length > 0 ? errors : undefined,
    });

    // ── Sprint 1.4: Auto first-comment on Instagram ──
    // Note: This runs AFTER the response is sent to the user for speed.
    // We use a fire-and-forget pattern here.
  } catch (err: any) {
    console.error("[PUBLISHER] Publish error:", err);
    return NextResponse.json({ error: err?.message || "Error" }, { status: 500 });
  }
}

export const maxDuration = 60;
