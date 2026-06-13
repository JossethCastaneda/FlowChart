import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { metaFetch, metaUrl } from "../lib/server-auth";

describe("metaFetch — camino único a la Graph API", () => {
  const realFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
  });

  afterEach(() => {
    global.fetch = realFetch;
  });

  it("manda el token por Authorization: Bearer, nunca en la URL", async () => {
    await metaFetch("https://graph.facebook.com/v25.0/me", "TOKEN_X");
    const [url, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(url)).not.toContain("TOKEN_X");
    expect((options.headers as Record<string, string>).Authorization).toBe("Bearer TOKEN_X");
  });

  it("limpia access_token si alguien lo dejó en la URL (red de seguridad)", async () => {
    await metaFetch("https://graph.facebook.com/v25.0/me?fields=id&access_token=LEAKED&limit=5", "TOKEN_X");
    const [url] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(url)).not.toContain("LEAKED");
    expect(String(url)).toContain("fields=id");
    expect(String(url)).toContain("limit=5");
  });

  it("preserva method/body y headers extra", async () => {
    await metaFetch("https://graph.facebook.com/v25.0/act_1/campaigns", "T", {
      method: "POST",
      body: JSON.stringify({ name: "x" }),
    });
    const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options.method).toBe("POST");
    expect((options.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });

  it("metaUrl construye URLs sin access_token", () => {
    const url = metaUrl("me/accounts", { fields: "id,name" });
    expect(url).toContain("me/accounts");
    expect(url).toContain("fields=id%2Cname");
    expect(url).not.toContain("access_token");
  });
});
