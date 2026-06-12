import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { metaFetch } from "@/lib/server-auth";
import { decryptToken } from "@/lib/encryption";
import { verifyCronAuth } from "@/lib/cron-auth";

const META_VERSION = process.env.META_API_VERSION || "v25.0";

/**
 * POST /api/cron/publish-scheduled
 *
 * Called by Vercel Workflow to publish a SPECIFIC post by postId.
 * Body: { postId: string }
 */
export async function POST(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { postId } = body;
    if (!postId) {
      return NextResponse.json({ error: "postId is required" }, { status: 400 });
    }

    const result = await publishSinglePost(postId);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[CRON POST] Error:", err);
    return NextResponse.json({ error: err?.message || "Error" }, { status: 500 });
  }
}

/**
 * GET /api/cron/publish-scheduled
 *
 * Cron job to publish all scheduled posts that are due.
 * Should be called every 1–5 minutes via Vercel Cron.
 */
export async function GET(req: NextRequest) {
  if (!verifyCronAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    const duePosts = await prisma.scheduledPost.findMany({
      where: {
        status: "Scheduled",
        scheduledAt: { lte: now },
      },
      take: 20,
      orderBy: { scheduledAt: "asc" },
    });

    if (duePosts.length === 0) {
      return NextResponse.json({ processed: 0, message: "No posts due" });
    }

    const results: Array<{ id: string; status: string; error?: string }> = [];
    for (const post of duePosts) {
      const result = await publishSinglePost(post.id);
      results.push(result);
    }

    console.log(
      `[CRON] Published ${results.filter((r) => r.status === "Published").length}/${duePosts.length} posts`
    );
    return NextResponse.json({ processed: duePosts.length, results });
  } catch (err: any) {
    console.error("[CRON GET] Error:", err);
    return NextResponse.json({ error: err?.message || "Error" }, { status: 500 });
  }
}

/**
 * Core publishing logic for a single post.
 * Used by both GET (cron batch) and POST (workflow single post).
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

  try {
    // Get workspace Meta token
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

    // Get pages
    const pagesUrl = `https://graph.facebook.com/${META_VERSION}/me/accounts?fields=id,name,access_token,instagram_business_account{id}&limit=100`;
    const pagesRes = await metaFetch(pagesUrl, accessToken);
    const pagesJson = await pagesRes.json();
    const pages = pagesJson.data || [];

    if (pages.length === 0) {
      await prisma.scheduledPost.update({
        where: { id: post.id },
        data: { status: "Failed", error: "No Facebook pages found" },
      });
      return { id: post.id, status: "Failed", error: "No pages" };
    }

    // Find target page
    let targetPage = pages[0];
    if (post.pageId) {
      const found = pages.find((p: any) => p.id === post.pageId);
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
        const mediaUrl = post.mediaUrls?.[0] || (post as any).mediaUrl;
        if (mediaUrl) {
          const isVideo = /\.(mp4|mov|avi|wmv|webm)(?:[?#].*)?$/i.test(mediaUrl);
          const endpoint = isVideo ? "videos" : "photos";
          const domain = isVideo ? "graph-video.facebook.com" : "graph.facebook.com";
          const payload: any = isVideo
            ? { file_url: mediaUrl, description: post.content }
            : { url: mediaUrl, message: post.content };

          const fbRes = await fetch(
            `https://${domain}/${META_VERSION}/${pageId}/${endpoint}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${pageToken}` },
              body: JSON.stringify(payload),
            }
          );
          const fbData = await fbRes.json();
          if (fbRes.ok && fbData.id) {
            externalIds.facebook = fbData.id;
          } else {
            errors.push(`FB: ${fbData?.error?.message || "Error"}`);
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
            errors.push(`FB: ${fbData?.error?.message || "Error"}`);
          }
        }
      } catch (err: any) {
        errors.push(`FB: ${err.message}`);
      }
    }

    // ── Publish to Instagram ──
    if (post.channels.includes("instagram") && igUserId) {
      try {
        const allMedia = post.mediaUrls?.length
          ? post.mediaUrls
          : (post as any).mediaUrl
          ? [(post as any).mediaUrl]
          : [];

        if (allMedia.length === 1) {
          const mediaUrl = allMedia[0];
          const isVideo = /\.(mp4|mov|avi|wmv|webm)(?:[?#].*)?$/i.test(mediaUrl);
          const containerBody: any = { caption: post.content };
          if (isVideo) {
            containerBody.media_type = "VIDEO";
            containerBody.video_url = mediaUrl;
          } else {
            containerBody.image_url = mediaUrl;
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

          if (containerRes.ok && containerData.id) {
            if (isVideo) {
              // Poll for video processing (max 30 seconds — use Workflow for longer videos)
              for (let i = 0; i < 6; i++) {
                await new Promise((r) => setTimeout(r, 5000));
                const statusRes = await fetch(
                  `https://graph.facebook.com/${META_VERSION}/${containerData.id}?fields=status_code`,
                  { headers: { Authorization: `Bearer ${pageToken}` } }
                );
                const statusData = await statusRes.json();
                if (statusData.status_code === "FINISHED") break;
                if (statusData.status_code === "ERROR") {
                  errors.push("IG: Video processing error");
                  break;
                }
              }
            }

            if (!errors.some((e) => e.startsWith("IG"))) {
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
                errors.push(`IG: ${publishData?.error?.message || "Error"}`);
              }
            }
          } else {
            errors.push(`IG: ${containerData?.error?.message || "Error creando container"}`);
          }
        } else if (allMedia.length >= 2) {
          // Carousel
          const childIds: string[] = [];
          for (const mediaUrl of allMedia.slice(0, 10)) {
            const isVideo = /\.(mp4|mov|avi|wmv|webm)(?:[?#].*)?$/i.test(mediaUrl);
            const childBody: any = { is_carousel_item: true };
            if (isVideo) {
              childBody.media_type = "VIDEO";
              childBody.video_url = mediaUrl;
            } else {
              childBody.image_url = mediaUrl;
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
                errors.push(`IG carousel: ${publishData?.error?.message || "Error"}`);
              }
            }
          }
        } else {
          errors.push("IG: Se requiere al menos una imagen o video");
        }
      } catch (err: any) {
        errors.push(`IG: ${err.message}`);
      }
    }

    // Update post status
    const hasSuccess = Object.keys(externalIds).length > 0;
    await prisma.scheduledPost.update({
      where: { id: post.id },
      data: {
        status: hasSuccess ? "Published" : "Failed",
        publishedAt: hasSuccess ? new Date() : null,
        externalIds,
        pageName: targetPage.name,
        pageId: targetPage.id,
        error: errors.length > 0 ? errors.join(" | ") : null,
      },
    });

    return {
      id: post.id,
      status: hasSuccess ? "Published" : "Failed",
      error: errors.length > 0 ? errors.join(" | ") : undefined,
    };
  } catch (postErr: any) {
    await prisma.scheduledPost.update({
      where: { id: post.id },
      data: { status: "Failed", error: postErr.message },
    });
    return { id: post.id, status: "Failed", error: postErr.message };
  }
}
