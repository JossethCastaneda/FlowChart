import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: {
    scheduledPost: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
    },
    integration: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/encryption", () => ({
  decryptToken: vi.fn((value: string) => value),
}));

vi.mock("@/lib/publisher/publish-to-meta", () => ({
  publishPostToMeta: vi.fn(),
}));

import prisma from "@/lib/prisma";
import { publishPostToMeta } from "@/lib/publisher/publish-to-meta";
import { publishSinglePost } from "@/lib/publisher/publish-single-post";

const p = prisma as unknown as {
  scheduledPost: {
    findUnique: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  integration: {
    findUnique: ReturnType<typeof vi.fn>;
  };
};

const publishToMetaMock = publishPostToMeta as unknown as ReturnType<typeof vi.fn>;

function makePost(overrides: Record<string, unknown> = {}) {
  return {
    id: "post_1",
    workspaceId: "ws_1",
    status: "Scheduled",
    qStashMessageId: "wf_current",
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    pageName: null,
    pageId: null,
    ...overrides,
  };
}

beforeEach(() => {
  p.scheduledPost.findUnique.mockReset();
  p.scheduledPost.updateMany.mockReset();
  p.scheduledPost.update.mockReset();
  p.integration.findUnique.mockReset();
  publishToMetaMock.mockReset();
});

describe("publishSinglePost schedule token guard", () => {
  it("skips without claiming when the workflow token is stale", async () => {
    p.scheduledPost.findUnique.mockResolvedValue(makePost());

    const result = await publishSinglePost("post_1", "wf_old");

    expect(result).toEqual({
      id: "post_1",
      status: "Skipped",
      error: "Skipped: schedule superseded",
    });
    expect(p.scheduledPost.updateMany).not.toHaveBeenCalled();
    expect(publishToMetaMock).not.toHaveBeenCalled();
  });

  it("includes the workflow token in the atomic claim", async () => {
    p.scheduledPost.findUnique
      .mockResolvedValueOnce(makePost({ qStashMessageId: "wf_current" }))
      .mockResolvedValueOnce(makePost({ status: "Publishing" }));
    p.scheduledPost.updateMany.mockResolvedValue({ count: 0 });

    await publishSinglePost("post_1", "wf_current");

    expect(p.scheduledPost.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "post_1",
          qStashMessageId: "wf_current",
        }),
      })
    );
  });

  it("clears the schedule token after a successful publish", async () => {
    p.scheduledPost.findUnique
      .mockResolvedValueOnce(makePost({ qStashMessageId: "wf_current" }))
      .mockResolvedValueOnce(makePost({ status: "Publishing", qStashMessageId: "wf_current" }));
    p.scheduledPost.updateMany.mockResolvedValue({ count: 1 });
    p.integration.findUnique.mockResolvedValue({
      connected: true,
      credentials: { accessToken: "meta-token" },
    });
    publishToMetaMock.mockResolvedValue({
      externalIds: { facebook: "fb_1" },
      errors: [],
      targetPage: { id: "page_1", name: "Page 1" },
    });

    const result = await publishSinglePost("post_1", "wf_current");

    expect(result.status).toBe("Published");
    expect(p.scheduledPost.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "post_1" },
        data: expect.objectContaining({
          status: "Published",
          qStashMessageId: null,
        }),
      })
    );
  });
});
