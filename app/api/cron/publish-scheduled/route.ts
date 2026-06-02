import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { metaFetch } from "@/lib/server-auth";

const META_VERSION = process.env.META_API_VERSION || "v22.0";

/**
 * GET /api/cron/publish-scheduled
 *
 * Cron job to publish scheduled posts that are due.
 * Should be called every 1-5 minutes via Vercel Cron or external scheduler.
 *
 * Security: Requires CRON_SECRET header for authorization.
 *
 * Logic:
 * 1. Find all ScheduledPost with status=Scheduled and scheduledAt <= now
 * 2. For each post, get the workspace's Meta token
 * 3. Publish to Facebook/Instagram (same logic as /api/publisher/publish)
 * 4. Update post status to Published or Failed
 */
export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    // Find posts that should be published now
    const duePosts = await prisma.scheduledPost.findMany({
      where: {
        status: "Scheduled",
        scheduledAt: { lte: now },
      },
      take: 20, // Process up to 20 posts per run
      orderBy: { scheduledAt: "asc" },
    });

    if (duePosts.length === 0) {
      return NextResponse.json({ processed: 0, message: "No posts due" });
    }

    const results: Array<{ id: string; status: string; error?: string }> = [];

    for (const post of duePosts) {
      try {
        // Get workspace Meta token
        const integration = await prisma.integration.findUnique({
          where: {
            workspaceId_provider: {
              workspaceId: post.workspaceId,
              provider: "meta",
            },
          },
        });

        if (!integration?.connected || !(integration.credentials as any)?.accessToken) {
          await prisma.scheduledPost.update({
            where: { id: post.id },
            data: { status: "Failed", error: "No Meta token found for workspace" },
          });
          results.push({ id: post.id, status: "Failed", error: "No token" });
          continue;
        }

        const accessToken = (integration.credentials as any).accessToken;

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
          results.push({ id: post.id, status: "Failed", error: "No pages" });
          continue;
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
            const mediaUrl = post.mediaUrls?.[0] || post.mediaUrl;
            if (mediaUrl) {
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
                errors.push(`FB: ${fbData?.error?.message || "Error"}`);
              }
            } else {
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
            const allMedia = post.mediaUrls?.length ? post.mediaUrls : (post.mediaUrl ? [post.mediaUrl] : []);
            if (allMedia.length === 1) {
              const mediaUrl = allMedia[0];
              const isVideo = /\.(mp4|mov|avi|wmv|webm)$/i.test(mediaUrl);
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
                  for (let i = 0; i < 6; i++) {
                    await new Promise((r) => setTimeout(r, 5000));
                    const statusRes = await fetch(
                      `https://graph.facebook.com/${META_VERSION}/${containerData.id}?fields=status_code`,
                      { headers: { Authorization: `Bearer ${pageToken}` } }
                    );
                    const statusData = await statusRes.json();
                    if (statusData.status_code === "FINISHED") break;
                    if (statusData.status_code === "ERROR") {
                      errors.push("IG: Video error");
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
                errors.push(`IG: ${containerData?.error?.message || "Error"}`);
              }
            } else if (allMedia.length >= 2) {
              // Carousel
              const childIds: string[] = [];
              for (const mediaUrl of allMedia.slice(0, 10)) {
                const isVideo = /\.(mp4|mov|avi|wmv|webm)$/i.test(mediaUrl);
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
            }
          } catch (err: any) {
            errors.push(`IG: ${err.message}`);
          }
        }

        // Update post
        const hasSuccess = Object.keys(externalIds).length > 0;
        await prisma.scheduledPost.update({
          where: { id: post.id },
          data: {
            status: hasSuccess ? "Published" : "Failed",
            publishedAt: hasSuccess ? new Date() : null,
            externalIds,
            error: errors.length > 0 ? errors.join(" | ") : null,
          },
        });

        results.push({
          id: post.id,
          status: hasSuccess ? "Published" : "Failed",
          error: errors.length > 0 ? errors.join(" | ") : undefined,
        });
      } catch (postErr: any) {
        await prisma.scheduledPost.update({
          where: { id: post.id },
          data: { status: "Failed", error: postErr.message },
        });
        results.push({ id: post.id, status: "Failed", error: postErr.message });
      }
    }

    console.log(`[CRON] Published ${results.filter((r) => r.status === "Published").length}/${duePosts.length} posts`);
    return NextResponse.json({ processed: duePosts.length, results });
  } catch (err: any) {
    console.error("[CRON] Error:", err);
    return NextResponse.json({ error: err?.message || "Error" }, { status: 500 });
  }
}
