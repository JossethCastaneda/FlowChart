import prisma from "@/lib/prisma";
import { decryptToken } from "@/lib/encryption";
import { publishPostToMeta } from "@/lib/publisher/publish-to-meta";

type IntegrationCredentials = {
  accessToken?: unknown;
};

const STALE_LOCK_MS = 5 * 60 * 1000;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Publishes one scheduled post. The optional schedule token makes old Workflow
 * runs harmless after a post is rescheduled, deleted, or published manually.
 */
export async function publishSinglePost(
  postId: string,
  expectedScheduleToken?: string
): Promise<{ id: string; status: string; error?: string }> {
  const post = await prisma.scheduledPost.findUnique({ where: { id: postId } });

  if (!post) {
    return { id: postId, status: "Failed", error: "Post not found" };
  }

  if (post.status === "Published") {
    return { id: postId, status: "Published" };
  }

  if (expectedScheduleToken && post.qStashMessageId !== expectedScheduleToken) {
    return {
      id: postId,
      status: "Skipped",
      error: "Skipped: schedule superseded",
    };
  }

  const staleBefore = new Date(Date.now() - STALE_LOCK_MS);
  const claim = await prisma.scheduledPost.updateMany({
    where: {
      id: postId,
      ...(expectedScheduleToken ? { qStashMessageId: expectedScheduleToken } : {}),
      OR: [
        { status: { in: ["Scheduled", "Failed"] } },
        { status: "Publishing", updatedAt: { lt: staleBefore } },
      ],
    },
    data: { status: "Publishing" },
  });

  if (claim.count === 0) {
    const current = await prisma.scheduledPost.findUnique({ where: { id: postId } });
    return {
      id: postId,
      status: current?.status ?? "Unknown",
      error: "Skipped: already publishing or published",
    };
  }

  const claimedPost = await prisma.scheduledPost.findUnique({ where: { id: postId } });
  if (!claimedPost) {
    return { id: postId, status: "Failed", error: "Post not found after claim" };
  }

  try {
    const integration = await prisma.integration.findUnique({
      where: {
        workspaceId_provider_userId: {
          workspaceId: claimedPost.workspaceId,
          provider: "meta",
          userId: "workspace",
        },
      },
    });

    const credentials = integration?.credentials as IntegrationCredentials | null;
    if (!integration?.connected || typeof credentials?.accessToken !== "string") {
      await prisma.scheduledPost.update({
        where: { id: claimedPost.id },
        data: { status: "Failed", error: "No Meta token found for workspace" },
      });
      return { id: claimedPost.id, status: "Failed", error: "No token" };
    }

    const accessToken = decryptToken(credentials.accessToken);
    if (!accessToken || accessToken.startsWith("enc:")) {
      await prisma.scheduledPost.update({
        where: { id: claimedPost.id },
        data: { status: "Failed", error: "Meta token could not be decrypted" },
      });
      return { id: claimedPost.id, status: "Failed", error: "Invalid token" };
    }

    const { externalIds, errors, targetPage } = await publishPostToMeta({
      post: claimedPost,
      accessToken,
      mode: "now",
    });

    const hasSuccess = Object.keys(externalIds).length > 0;
    await prisma.scheduledPost.update({
      where: { id: claimedPost.id },
      data: {
        status: hasSuccess ? "Published" : "Failed",
        publishedAt: hasSuccess ? new Date() : null,
        externalIds,
        pageName: targetPage?.name ?? claimedPost.pageName,
        pageId: targetPage?.id ?? claimedPost.pageId,
        error: errors.length > 0 ? errors.join(" | ") : null,
        qStashMessageId: hasSuccess ? null : undefined,
      },
    });

    return {
      id: claimedPost.id,
      status: hasSuccess ? "Published" : "Failed",
      error: errors.length > 0 ? errors.join(" | ") : undefined,
    };
  } catch (error) {
    const message = getErrorMessage(error);
    await prisma.scheduledPost.update({
      where: { id: claimedPost.id },
      data: { status: "Failed", error: message },
    });
    return { id: claimedPost.id, status: "Failed", error: message };
  }
}
