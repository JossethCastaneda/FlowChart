import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";
import prisma from "@/lib/prisma";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { getMetaAccessToken, metaFetch } from "@/lib/server-auth";

const META_VERSION = process.env.META_API_VERSION || "v22.0";

/**
 * POST /api/publisher/publish
 *
 * Publishes a post to Facebook Page and/or Instagram.
 * Body: { postId } — publishes an existing ScheduledPost
 *
 * Flow:
 * 1. Get the post from DB
 * 2. Get Meta access token
 * 3. For Facebook: POST /{page-id}/feed with message
 * 4. For Instagram: POST /{ig-user-id}/media (create container) + POST /{ig-user-id}/media_publish
 * 5. Update post status to Published with externalIds
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

    // Get the post
    const post = await prisma.scheduledPost.findFirst({
      where: { id: postId, workspaceId },
    });

    if (!post) {
      return NextResponse.json({ error: "Post no encontrado" }, { status: 404 });
    }

    if (post.status === "Published") {
      return NextResponse.json({ error: "Este post ya fue publicado" }, { status: 400 });
    }

    // Get Meta token
    const accessToken = await getMetaAccessToken(req);
    if (!accessToken) {
      return NextResponse.json(
        { error: "No se encontró token de Meta. Reconecta tu cuenta en Integraciones." },
        { status: 401 }
      );
    }

    // Get pages to find the right page
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

    // Find the target page
    let targetPage = pages[0]; // default to first
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

    // ── Publish to Facebook ──
    if (post.channels.includes("facebook")) {
      try {
        const fbBody: any = { message: post.content };

        // If there's media, attach it
        const mediaUrl = post.mediaUrls?.[0] || post.mediaUrl;
        if (mediaUrl) {
          // Photo post
          const fbRes = await fetch(
            `https://graph.facebook.com/${META_VERSION}/${pageId}/photos`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${pageToken}` },
              body: JSON.stringify({ url: mediaUrl, caption: post.content }),
            }
          );
          const fbData = await fbRes.json();
          if (fbRes.ok && fbData.id) {
            externalIds.facebook = fbData.id;
          } else {
            errors.push(`Facebook: ${fbData?.error?.message || "Error desconocido"}`);
          }
        } else {
          // Text-only post
          const fbRes = await fetch(
            `https://graph.facebook.com/${META_VERSION}/${pageId}/feed`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${pageToken}` },
              body: JSON.stringify(fbBody),
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
        const mediaUrl = post.mediaUrls?.[0] || post.mediaUrl;
        if (!mediaUrl) {
          errors.push("Instagram: Se requiere una imagen o video para publicar");
        } else {
          // Step 1: Create media container
          const containerBody: any = {
            image_url: mediaUrl,
            caption: post.content,
          };

          // Check if it's a video (basic check)
          const isVideo = /\.(mp4|mov|avi|wmv|webm)$/i.test(mediaUrl);
          if (isVideo) {
            containerBody.media_type = "VIDEO";
            containerBody.video_url = mediaUrl;
            delete containerBody.image_url;
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
            errors.push(`Instagram container: ${containerData?.error?.message || "Error"}`);
          } else {
            // Step 2: Publish the container
            // For videos, we may need to wait for processing
            if (isVideo) {
              // Wait up to 30s for video processing
              let ready = false;
              for (let i = 0; i < 6; i++) {
                await new Promise((r) => setTimeout(r, 5000));
                const statusRes = await fetch(
                  `https://graph.facebook.com/${META_VERSION}/${containerData.id}?fields=status_code`,
                  { headers: { Authorization: `Bearer ${pageToken}` } }
                );
                const statusData = await statusRes.json();
                if (statusData.status_code === "FINISHED") {
                  ready = true;
                  break;
                }
                if (statusData.status_code === "ERROR") {
                  errors.push("Instagram: Error procesando video");
                  break;
                }
              }
              if (!ready && errors.length === 0) {
                errors.push("Instagram: Video aún procesándose, intenta de nuevo");
              }
            }

            if (errors.filter((e) => e.startsWith("Instagram")).length === 0) {
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
                errors.push(`Instagram publish: ${publishData?.error?.message || "Error"}`);
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
