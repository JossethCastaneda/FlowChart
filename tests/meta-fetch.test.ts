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

  it("403 por token/permisos (no rate-limit) NO se reintenta — falla rápido", async () => {
    const body = JSON.stringify({ error: { code: 190, message: "Error validating access token" } });
    const fetchMock = vi.fn().mockResolvedValue(new Response(body, { status: 403 }));
    global.fetch = fetchMock;

    const res = await metaFetch("https://graph.facebook.com/v25.0/me", "T");

    expect(res.status).toBe(403);
    expect(fetchMock.mock.calls.length).toBe(1); // sin reintentos (antes eran 4 intentos / ~14s)
  });

  it("403 con código de rate-limit (4) sí reintenta hasta tener éxito", async () => {
    vi.useFakeTimers();
    try {
      const rl = () => new Response(JSON.stringify({ error: { code: 4, message: "request limit reached" } }), { status: 403 });
      const ok = () => new Response("{}", { status: 200 });
      const fetchMock = vi.fn().mockResolvedValueOnce(rl()).mockResolvedValueOnce(ok());
      global.fetch = fetchMock;

      const p = metaFetch("https://graph.facebook.com/v25.0/me", "T");
      await vi.runAllTimersAsync();
      const res = await p;

      expect(res.status).toBe(200);
      expect(fetchMock.mock.calls.length).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
