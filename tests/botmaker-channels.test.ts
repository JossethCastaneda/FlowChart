import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchBotmakerChannels } from "../lib/botmaker";

const conn = { baseUrl: "https://api.botmaker.com/v2.0", accessToken: "TKN" };

function mockResponse(body: unknown, status = 200) {
  global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })) as typeof fetch;
}

describe("fetchBotmakerChannels", () => {
  const realFetch = global.fetch;
  afterEach(() => { global.fetch = realFetch; });

  it("infiere el canónico por número/platform y NO descarta canales", async () => {
    mockResponse({
      items: [
        { id: "c1", platform: "wa", number: "5215512345678" }, // alias wa → whatsapp
        { id: "c2", platform: "webwidget", name: "Mi Web" },     // web → webchat
        { id: "c3", platform: "desconocido" },                    // sin número → webchat (inferido)
        { id: "c4", platform: "INSTAGRAM", name: "ig1" },         // insta → instagram
      ],
    });
    const r = await fetchBotmakerChannels(conn);
    expect(r.rawCount).toBe(4);
    expect(r.channels.length).toBe(4); // ninguno se descarta en silencio
    const byId = Object.fromEntries(r.channels.map((c) => [c.id, c.canonical]));
    expect(byId.c1).toBe("whatsapp");
    expect(byId.c2).toBe("webchat");
    expect(byId.c3).toBe("webchat");
    expect(byId.c4).toBe("instagram");
    expect([...r.platforms].sort()).toEqual(["INSTAGRAM", "desconocido", "wa", "webwidget"]);
  });

  it("tolera arreglo plano y claves wrapper/campos alternos", async () => {
    mockResponse([{ id: "x1", platform: "whatsapp", number: "5215500000000" }]);
    expect((await fetchBotmakerChannels(conn)).channels.length).toBe(1);

    mockResponse({ channels: [{ channelId: "y1", channelType: "wsp", phoneNumber: "5215511111111" }] });
    const r = await fetchBotmakerChannels(conn);
    expect(r.channels[0].id).toBe("y1");
    expect(r.channels[0].canonical).toBe("whatsapp"); // "wsp"
    expect(r.channels[0].number).toBe("5215511111111");
  });

  it("respuesta vacía → rawCount 0, sin canales", async () => {
    mockResponse({ items: [] });
    const r = await fetchBotmakerChannels(conn);
    expect(r.rawCount).toBe(0);
    expect(r.channels).toEqual([]);
  });

  it("HTTP no-ok → propaga httpStatus, sin canales", async () => {
    mockResponse({ error: { message: "invalid token" } }, 401);
    const r = await fetchBotmakerChannels(conn);
    expect(r.httpStatus).toBe(401);
    expect(r.channels).toEqual([]);
    expect(r.rawCount).toBe(0);
  });
});
