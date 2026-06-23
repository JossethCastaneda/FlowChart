import { describe, it, expect, vi, beforeEach } from "vitest";

// El SDK de Workflow no aplica en un test plano; "use workflow"/"use step" son
// directivas inertes y `sleep` se mockea para que delaySeconds=0 sea no-op.
vi.mock("workflow", () => ({ sleep: vi.fn() }));

const publishSinglePostMock = vi.fn();
vi.mock("@/lib/publisher/publish-single-post", () => ({
  publishSinglePost: (...args: unknown[]) => publishSinglePostMock(...args),
}));

import { publishPostWorkflow } from "@/workflows/publish-post";

beforeEach(() => {
  publishSinglePostMock.mockReset();
});

describe("publishPostWorkflow", () => {
  // Regresión: el step DEBE reenviar el scheduleToken a publishSinglePost; si no,
  // el guard de supersesión queda muerto y un post reprogramado se publica a la
  // hora vieja (no se puede cancelar un run de Workflow).
  it("reenvía el scheduleToken a publishSinglePost (guard de supersesión)", async () => {
    publishSinglePostMock.mockResolvedValue({ id: "post_1", status: "Published" });

    const result = await publishPostWorkflow("post_1", 0, "wf_token");

    expect(publishSinglePostMock).toHaveBeenCalledWith("post_1", "wf_token");
    expect(result).toEqual({ id: "post_1", status: "Published" });
  });

  it("lanza error si la publicación falla (para que Workflow reintente)", async () => {
    publishSinglePostMock.mockResolvedValue({ id: "post_1", status: "Failed", error: "boom" });

    await expect(publishPostWorkflow("post_1", 0, "wf_token")).rejects.toThrow(/boom/);
  });
});
