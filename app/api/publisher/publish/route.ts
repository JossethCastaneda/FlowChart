import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";
import prisma from "@/lib/prisma";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { getMetaAccessToken, metaFetch } from "@/lib/server-auth";

const META_VERSION = process.env.META_API_VERSION || "v22.0";

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
 * POST /api/publisher/publish
 *
 * Publishes a post to Facebook Page and/or Instagram.
 * Handles both URL-based and binary multipart uploads.
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

    const accessToken = await getMetaAccessToken(req, "publisher");
    if (!accessToken) {
      return NextResponse.json(
        { error: "No se encontró token de Meta. Reconecta tu cuenta en Integraciones." },
        { status: 401 }
      );
    }

    const pagesUrl = `https://graph.facebook.com/${META_VERSION}/me/accounts?fields=id,name,access_token,instagram_business_account{id}&limit=100`;
    const pagesRes = await metaFetch(pagesUrl, accessToken);
    const pagesJson = await pagesRes.json();
    const pages = pagesJson.data || [];

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

    const externalIds: Record<string, string> = {};
    const errors: string[] = [];

    // ── Get media info ──
    const mediaUrl = post.mediaUrls?.[0] || post.mediaUrl || "";

    // ── Publish to Facebook ──
    if (post.channels.includes("facebook")) {
      try {
        if (mediaUrl) {
          // Try to resolve as binary buffer (for data: URLs)
          const resolved = resolveMediaToBuffer(mediaUrl);

          if (resolved) {
            // ── Multipart binary upload (for data: URLs, /tmp files) ──
            const formData = new FormData();
            const blob = new Blob([new Uint8Array(resolved.buffer)], { type: resolved.contentType });
            formData.append("source", blob, resolved.filename);
            formData.append("message", post.content);
            formData.append("access_token", pageToken);

            const fbRes = await fetch(
              `https://graph.facebook.com/${META_VERSION}/${pageId}/photos`,
              { method: "POST", body: formData }
            );
            const fbData = await fbRes.json();
            if (fbRes.ok && fbData.id) {
              externalIds.facebook = fbData.id;
            } else {
              errors.push(`Facebook: ${fbData?.error?.message || "Error desconocido"}`);
            }
          } else {
            // ── URL-based upload (for https:// URLs) ──
            const fbRes = await fetch(
              `https://graph.facebook.com/${META_VERSION}/${pageId}/photos`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${pageToken}` },
                body: JSON.stringify({ url: mediaUrl, message: post.content }),
              }
            );
            const fbData = await fbRes.json();
            if (fbRes.ok && fbData.id) {
              externalIds.facebook = fbData.id;
            } else {
              errors.push(`Facebook: ${fbData?.error?.message || "Error desconocido"}`);
            }
          }
        } else {
          // Text-only post
          const fbRes = await fetch(
            `https://graph.facebook.com/${META_VERSION}/${pageId}/feed`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${pageToken}` },
              body: JSON.stringify({ message: post.content }),
            }
          );
          const fbData = await fbRes.json();
          if (fbRes.ok && fbData.id) {
            externalIds.facebook = fbData.id;
          } else {
            errors.push(`Facebook: ${fbData?.error?.message || "Error desconocido"}`);
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
            // Upload to Facebook as unpublished photo to get a public URL
            const formData = new FormData();
            const blob = new Blob([new Uint8Array(resolved.buffer)], { type: resolved.contentType });
            formData.append("source", blob, resolved.filename);
            formData.append("published", "false");
            formData.append("access_token", pageToken);

            const uploadRes = await fetch(
              `https://graph.facebook.com/${META_VERSION}/${pageId}/photos`,
              { method: "POST", body: formData }
            );
            const uploadData = await uploadRes.json();

            if (uploadRes.ok && uploadData.id) {
              // Get the image URL from the uploaded photo
              const photoRes = await fetch(
                `https://graph.facebook.com/${META_VERSION}/${uploadData.id}?fields=images`,
                { headers: { Authorization: `Bearer ${pageToken}` } }
              );
              const photoData = await photoRes.json();
              const bestImage = photoData?.images?.[0]?.source;
              if (bestImage) {
                igMediaUrl = bestImage;
              } else {
                errors.push("Instagram: No se pudo obtener URL de imagen subida");
              }
            } else {
              errors.push(`Instagram: Error subiendo imagen: ${uploadData?.error?.message || "Error"}`);
            }
          }

          // Now publish to Instagram with the public URL
          if (!errors.some(e => e.startsWith("Instagram"))) {
            if (allMedia.length === 1) {
              // ── Single media post ──
              const isVideo = /\.(mp4|mov|avi|wmv|webm)$/i.test(igMediaUrl);
              const containerBody: any = { caption: post.content };
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
                  let ready = false;
                  for (let i = 0; i < 6; i++) {
                    await new Promise((r) => setTimeout(r, 5000));
                    const statusRes = await fetch(
                      `https://graph.facebook.com/${META_VERSION}/${containerData.id}?fields=status_code`,
                      { headers: { Authorization: `Bearer ${pageToken}` } }
                    );
                    const statusData = await statusRes.json();
                    if (statusData.status_code === "FINISHED") { ready = true; break; }
                    if (statusData.status_code === "ERROR") { errors.push("Instagram: Error procesando video"); break; }
                  }
                  if (!ready && !errors.some((e) => e.includes("video"))) {
                    errors.push("Instagram: Video aún procesándose, intenta de nuevo");
                  }
                }

                if (!errors.some((e) => e.startsWith("Instagram"))) {
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
                const isVideo = /\.(mp4|mov|avi|wmv|webm)$/i.test(mUrl);
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
                      caption: post.content,
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
  } catch (err: any) {
    console.error("[PUBLISHER] Publish error:", err);
    return NextResponse.json({ error: err?.message || "Error" }, { status: 500 });
  }
}

export const maxDuration = 60;
