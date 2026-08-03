import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock server-auth para (a) controlar las páginas devueltas y (b) cortar la
// cadena de imports que carga lib/env (parseEnv lanzaría sin DATABASE_URL).
vi.mock("@/lib/server-auth", () => ({
  metaGetAll: vi.fn(),
}));

import { metaGetAll } from "@/lib/server-auth";
import { publishPostToMeta } from "../lib/publisher/publish-to-meta";

const mGetAll = metaGetAll as unknown as ReturnType<typeof vi.fn>;
const fetchMock = vi.fn();

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
function jsonRes(body: any, ok = true) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  return { ok, json: async () => body } as any;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
function page(extra: Record<string, any> = {}) {
  return {
    id: "PAGE",
    name: "Mi Página",
    access_token: "ptok",
    instagram_business_account: { id: "IG" },
    ...extra,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
function makePost(overrides: Record<string, any> = {}) {
  return {
    id: "post1",
    workspaceId: "ws1",
    content: "contenido por defecto",
    contentByPlatform: null,
    channels: ["facebook"],
    mediaUrls: [],
    mediaUrl: null,
    externalIds: null,
    pageId: null,
    pageName: null,
    scheduledAt: null,
    status: "Draft",
    ...overrides,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  } as any;
}

beforeEach(() => {
  mGetAll.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("publishPostToMeta", () => {
  it("FB solo-texto usa contentByPlatform.facebook (modo now)", async () => {
    mGetAll.mockResolvedValue({ data: [page()] });
    fetchMock.mockResolvedValue(jsonRes({ id: "fb_123" }));

    const post = makePost({
      channels: ["facebook"],
      contentByPlatform: { facebook: "hola FB", instagram: "hola IG" },
    });

    const res = await publishPostToMeta({ post, accessToken: "tok", mode: "now" });

    expect(res.errors).toEqual([]);
    expect(res.externalIds.facebook).toBe("fb_123");
    expect(res.targetPage).toEqual({ id: "PAGE", name: "Mi Página" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/PAGE/feed");
    expect(JSON.parse(init.body).message).toBe("hola FB");
  });

  it("modo fb_scheduled añade scheduled_publish_time y OMITE Instagram", async () => {
    mGetAll.mockResolvedValue({ data: [page()] });
    fetchMock.mockResolvedValue(jsonRes({ id: "fb_sched" }));

    const when = new Date(Date.now() + 3600_000);
    const post = makePost({
      channels: ["facebook", "instagram"],
      mediaUrls: ["https://cdn.example/a.jpg"],
      scheduledAt: when,
      status: "Scheduled",
    });

    const res = await publishPostToMeta({ post, accessToken: "tok", mode: "fb_scheduled" });

    expect(res.errors).toEqual([]);
    expect(res.externalIds.facebook).toBe("fb_sched");
    // IG no se toca en modo programado.
    expect(res.externalIds.instagram).toBeUndefined();

    // Solo la llamada de subida de foto a FB (sin HEAD: extensión .jpg detectada).
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/PAGE/photos");
    const body = JSON.parse(init.body);
    expect(body.published).toBe(false);
    expect(body.scheduled_publish_time).toBe(Math.floor(when.getTime() / 1000));
    expect(body.url).toBe("https://cdn.example/a.jpg");
  });

  it("idempotencia por canal: no republica FB si externalIds.facebook ya existe", async () => {
    mGetAll.mockResolvedValue({ data: [page()] });

    const post = makePost({
      channels: ["facebook"],
      externalIds: { facebook: "ya_publicado" },
    });

    const res = await publishPostToMeta({ post, accessToken: "tok", mode: "now" });

    expect(res.externalIds.facebook).toBe("ya_publicado");
    // No se llamó a Graph API para publicar de nuevo.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sin páginas → error y targetPage null, sin llamar a publicar", async () => {
    mGetAll.mockResolvedValue({ data: [] });

    const post = makePost({ channels: ["facebook"] });
    const res = await publishPostToMeta({ post, accessToken: "tok", mode: "now" });

    expect(res.targetPage).toBeNull();
    expect(res.externalIds).toEqual({});
    expect(res.errors.join(" ")).toMatch(/Facebook/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("selecciona la página por post.pageId", async () => {
    mGetAll.mockResolvedValue({
      data: [page(), page({ id: "PAGE2", name: "Segunda", access_token: "ptok2" })],
    });
    fetchMock.mockResolvedValue(jsonRes({ id: "fb_999" }));

    const post = makePost({ channels: ["facebook"], pageId: "PAGE2" });
    const res = await publishPostToMeta({ post, accessToken: "tok", mode: "now" });

    expect(res.targetPage).toEqual({ id: "PAGE2", name: "Segunda" });
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("/PAGE2/feed");
  });
});
