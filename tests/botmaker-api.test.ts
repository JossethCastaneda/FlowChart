/**
 * tests/botmaker-api.test.ts
 *
 * Tests unitarios para lib/botmaker-api.ts
 * Cobertura: 100% de funciones con mocks de fetch (sin red real).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  bmFetch,
  createConnection,
  healthCheck,
  parseChannels,
  listSessions,
  listContacts,
  getContact,
  updateContact,
  setContactVariables,
  setContactTags,
  listChats,
  getChat,
  closeChat,
  assignChat,
  snoozeChat,
  sendMessage,
  sendImage,
  sendDocument,
  sendButtons,
  triggerIntent,
  sendWhatsAppTemplate,
  listAgents,
  getAgent,
  createAgent,
  updateAgent,
  deleteAgent,
  listWaTemplates,
  getWaTemplate,
  sendNotification,
  listNotifications,
  cancelNotification,
  listWebhooks,
  createWebhook,
  deleteWebhook,
  listChannels,
  getChannel,
  verifyWebhookSignature,
  BM_WEBHOOK_EVENTS,
  type BmConnection,
} from "@/lib/botmaker-api";

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function mockFetch(status: number, body: unknown, ok = status < 400): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok,
      status,
      json: () => Promise.resolve(body),
    })
  );
}

function mockFetchError(err: Error): void {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(err));
}

/** Crea un stub de fetch que siempre responde con JSON. */
function makeStub(body: unknown, status = 200, ok = status < 400) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(body),
  });
}

const conn: BmConnection = createConnection("test-token", "https://api.botmaker.com/v2.0");

beforeEach(() => { 
  vi.restoreAllMocks(); 
  // Disable real delays for exponential backoff during tests
  vi.stubGlobal("setTimeout", (cb: Function) => cb());
});

// â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• 
// createConnection / bmFetch
// â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• 
describe("createConnection", () => {
  it("usa DEFAULT_BASE cuando no se pasa baseUrl", () => {
    const c = createConnection("tok");
    expect(c.baseUrl).toBe("https://api.botmaker.com/v2.0");
    expect(c.accessToken).toBe("tok");
  });

  it("normaliza una baseUrl sin esquema", () => {
    const c = createConnection("tok", "api.ejemplo.com");
    expect(c.baseUrl).toBe("https://api.ejemplo.com");
  });

  it("quita trailing slash", () => {
    const c = createConnection("tok", "https://api.ejemplo.com/");
    expect(c.baseUrl).toBe("https://api.ejemplo.com");
  });
});

describe("bmFetch", () => {
  it("pasa access-token en el header", async () => {
    const stub = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({}) });
    vi.stubGlobal("fetch", stub);
    await bmFetch(conn, "/test");
    expect(stub).toHaveBeenCalledWith(
      expect.stringContaining("/test"),
      expect.objectContaining({
        headers: expect.objectContaining({ "access-token": "test-token" }),
      })
    );
  });

  it("reintenta en 429", async () => {
    const stub = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 429, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({}) });
    vi.stubGlobal("fetch", stub);
    const res = await bmFetch(conn, "/test", {}, 1);
    expect(stub).toHaveBeenCalledTimes(2);
    expect(res.status).toBe(200);
  });
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// healthCheck
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
describe("healthCheck", () => {
  it("devuelve ok=true con canales encontrados", async () => {
    mockFetch(200, {
      items: [{ id: "ch1", platform: "Whatsapp", name: "Canal WA" }],
    });
    const result = await healthCheck(conn);
    expect(result.ok).toBe(true);
    expect(result.channelsFound).toBe(1);
    expect(result.httpStatus).toBe(200);
  });

  it("devuelve ok=false en 401", async () => {
    mockFetch(401, { message: "Unauthorized" }, false);
    const result = await healthCheck(conn);
    expect(result.ok).toBe(false);
    expect(result.httpStatus).toBe(401);
  });

  it("devuelve ok=false en error de red", async () => {
    mockFetchError(new Error("Network error"));
    const result = await healthCheck(conn);
    expect(result.ok).toBe(false);
    expect(result.httpStatus).toBe(0);
    expect(result.error).toContain("Network error");
  });
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// listChannels â€” tolerancia de shapes
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
describe("listChannels â€” shapes de respuesta", () => {
  const cases = [
    { desc: "arreglo plano", body: [{ id: "1", platform: "Whatsapp" }] },
    { desc: "{ items }", body: { items: [{ id: "2", platform: "webchat" }] } },
    { desc: "{ channels }", body: { channels: [{ id: "3", platform: "instagram" }] } },
    { desc: "{ data }", body: { data: [{ id: "4", platform: "facebook" }] } },
    { desc: "{ result }", body: { result: [{ id: "5", platform: "messenger" }] } },
  ];

  for (const tc of cases) {
    it(`parsea ${tc.desc}`, async () => {
      mockFetch(200, tc.body);
      const channels = await listChannels(conn);
      expect(channels).toHaveLength(1);
      expect(channels[0].id).toBeTruthy();
    });
  }

  it("infiere WhatsApp por nÃºmero de telÃ©fono cuando platform es desconocido", async () => {
    mockFetch(200, { items: [{ id: "ch1", platform: "unknown_platform", number: "5491155556666" }] });
    const channels = await listChannels(conn);
    expect(channels[0].canonical).toBe("whatsapp");
  });

  it("devuelve [] en error HTTP", async () => {
    mockFetch(500, { error: "Server Error" }, false);
    const channels = await listChannels(conn);
    expect(channels).toEqual([]);
  });
});

describe("getChannel", () => {
  it("devuelve el canal parseado correctamente", async () => {
    mockFetch(200, { id: "ch-1", platform: "Whatsapp", name: "Principal" });
    const result = await getChannel(conn, "ch-1");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.channel.id).toBe("ch-1");
  });
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// listSessions
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
describe("listSessions", () => {
  it("agrega sesiones de mÃºltiples pÃ¡ginas hasta nextPage=null", async () => {
    const stub = vi.fn()
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: () => Promise.resolve({ items: [{ id: "s1" }, { id: "s2" }], nextPage: "/sessions?cursor=abc" }),
      })
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: () => Promise.resolve({ items: [{ id: "s3" }], nextPage: null }),
      });
    vi.stubGlobal("fetch", stub);

    const sessions = await listSessions(conn, {
      from: "2024-01-01T00:00:00Z",
      to: "2024-01-31T23:59:59Z",
    });
    expect(sessions).toHaveLength(3);
    expect(stub).toHaveBeenCalledTimes(2);
  });

  it("respeta el lÃ­mite maxPages", async () => {
    const stub = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: () => Promise.resolve({ items: [{ id: "s1" }], nextPage: "/sessions?cursor=next" }),
    });
    vi.stubGlobal("fetch", stub);

    const sessions = await listSessions(conn, {
      from: "2024-01-01T00:00:00Z",
      to: "2024-01-31T23:59:59Z",
      maxPages: 2,
    });
    expect(stub).toHaveBeenCalledTimes(2);
    expect(sessions).toHaveLength(2);
  });

  it("devuelve [] si el primer fetch falla", async () => {
    mockFetch(401, { error: "Unauthorized" }, false);
    const sessions = await listSessions(conn, {
      from: "2024-01-01T00:00:00Z",
      to: "2024-01-31T23:59:59Z",
    });
    expect(sessions).toEqual([]);
  });
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Contactos
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
describe("listContacts", () => {
  it("devuelve pÃ¡gina de contactos", async () => {
    mockFetch(200, { items: [{ id: "c1", name: "Juan" }], nextPage: null });
    const page = await listContacts(conn);
    expect(page.items).toHaveLength(1);
    expect(page.items[0].name).toBe("Juan");
  });
});

describe("getContact", () => {
  it("devuelve ok=true con el contacto", async () => {
    mockFetch(200, { id: "c1", name: "Juan", phone: "5491155556666" });
    const result = await getContact(conn, "5491155556666");
    expect(result.ok).toBe(true);
  });

  it("devuelve ok=false en 404", async () => {
    mockFetch(404, { message: "Not found" }, false);
    const result = await getContact(conn, "000");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(404);
  });
});

describe("updateContact", () => {
  it("devuelve ok=true al actualizar", async () => {
    mockFetch(200, { id: "c1", name: "Pedro" });
    const result = await updateContact(conn, {
      platformContactId: "5491155556666",
      platform: "Whatsapp",
      name: "Pedro",
    });
    expect(result.ok).toBe(true);
  });
});

describe("setContactVariables", () => {
  it("envÃ­a variables correctamente", async () => {
    const stub = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({}) });
    vi.stubGlobal("fetch", stub);
    await setContactVariables(conn, {
      platformContactId: "5491155556666",
      platform: "Whatsapp",
      variables: { nombre: "Juan", score: 10 },
    });
    const call = stub.mock.calls[0];
    const body = JSON.parse(call[1].body);
    expect(body.variables).toEqual({ nombre: "Juan", score: 10 });
  });
});

describe("setContactTags", () => {
  it("llama dos veces si hay addTags y removeTags", async () => {
    const stub = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({}) });
    vi.stubGlobal("fetch", stub);
    const result = await setContactTags(conn, {
      platformContactId: "5491155556666",
      platform: "Whatsapp",
      addTags: ["vip", "activo"],
      removeTags: ["inactivo"],
    });
    expect(stub).toHaveBeenCalledTimes(2);
    expect(result.ok).toBe(true);
  });
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Chats
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
describe("listChats", () => {
  it("devuelve chats correctamente", async () => {
    mockFetch(200, { items: [{ id: "ch1", status: "open" }], nextPage: null });
    const result = await listChats(conn, { status: "open" });
    expect(result.items).toHaveLength(1);
  });
});

describe("getChat", () => {
  it("devuelve ok=true", async () => {
    mockFetch(200, { id: "ch1", status: "open" });
    const result = await getChat(conn, "ch1");
    expect(result.ok).toBe(true);
  });
});

describe("closeChat", () => {
  it("devuelve ok=true con chatId", async () => {
    mockFetch(200, { chatId: "ch1", closed: true });
    const result = await closeChat(conn, "ch1", { typification: "resuelto" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.closed).toBe(true);
  });
});

describe("assignChat", () => {
  it("devuelve ok=true con agentId", async () => {
    mockFetch(200, { chatId: "ch1", agentId: "ag1" });
    const result = await assignChat(conn, "ch1", "ag1");
    expect(result.ok).toBe(true);
  });
});

describe("snoozeChat", () => {
  it("devuelve ok=true", async () => {
    mockFetch(200, { chatId: "ch1", snoozedUntil: "2024-02-01T00:00:00Z" });
    const result = await snoozeChat(conn, "ch1", "2024-02-01T00:00:00Z");
    expect(result.ok).toBe(true);
  });
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Acciones de chat (mensajes)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
describe("sendMessage", () => {
  it("envia a /chats-actions/send-message con messageText", async () => {
    const stub = makeStub({ messageId: "m1" });
    vi.stubGlobal("fetch", stub);
    const result = await sendMessage(conn, {
      chatPlatform: "Whatsapp",
      chatChannelId: "ch1",
      platformContactId: "5491155556666",
      messageText: "Hola mundo",
    });
    expect(result.ok).toBe(true);
    const url: string = stub.mock.calls[0][0];
    expect(url).toContain("/chats-actions/send-message");
  });
});

describe("sendImage", () => {
  it("envÃ­a a /chats-actions/send-image", async () => {
    const stub = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({}) });
    vi.stubGlobal("fetch", stub);
    await sendImage(conn, {
      chatPlatform: "Whatsapp",
      chatChannelId: "ch1",
      platformContactId: "5491155556666",
      imageUrl: "https://example.com/img.png",
    });
    expect(stub.mock.calls[0][0]).toContain("/chats-actions/send-image");
  });
});

describe("sendDocument", () => {
  it("envÃ­a a /chats-actions/send-document", async () => {
    const stub = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({}) });
    vi.stubGlobal("fetch", stub);
    await sendDocument(conn, {
      chatPlatform: "Whatsapp",
      chatChannelId: "ch1",
      platformContactId: "5491155556666",
      documentUrl: "https://example.com/doc.pdf",
    });
    expect(stub.mock.calls[0][0]).toContain("/chats-actions/send-document");
  });
});

describe("sendButtons", () => {
  it("envÃ­a botones correctamente", async () => {
    const stub = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({}) });
    vi.stubGlobal("fetch", stub);
    await sendButtons(conn, {
      chatPlatform: "Whatsapp",
      chatChannelId: "ch1",
      platformContactId: "5491155556666",
      messageText: "Elige:",
      buttons: [{ id: "1", title: "SÃ­" }, { id: "2", title: "No" }],
    });
    expect(stub.mock.calls[0][0]).toContain("/chats-actions/send-buttons");
    const body = JSON.parse(stub.mock.calls[0][1].body);
    expect(body.buttons).toHaveLength(2);
  });
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Intent / Templates
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
describe("triggerIntent", () => {
  it("envia POST a /intent/v2", async () => {
    const stub = makeStub({ intentId: "i1" });
    vi.stubGlobal("fetch", stub);
    const result = await triggerIntent(conn, {
      chatPlatform: "Whatsapp",
      chatChannelNumber: "5411XXXXXXXX",
      platformContactId: "54911XXXXXXXX",
      ruleNameOrId: "bienvenida",
    });
    expect(result.ok).toBe(true);
    expect(stub.mock.calls[0][0]).toContain("/intent/v2");
  });
});

describe("sendWhatsAppTemplate", () => {
  it("dispara el template por nombre", async () => {
    const stub = makeStub({ intentId: "i2" });
    vi.stubGlobal("fetch", stub);
    await sendWhatsAppTemplate(conn, {
      channelNumber: "5411XXXXXXXX",
      contactPhone: "54911XXXXXXXX",
      templateName: "plantilla_aprobada",
      variables: { nombre: "Juan" },
    });
    const body = JSON.parse(stub.mock.calls[0][1].body);
    expect(body.ruleNameOrId).toBe("plantilla_aprobada");
    expect(body.chatPlatform).toBe("Whatsapp");
    expect(body.variables).toEqual({ nombre: "Juan" });
  });
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Agentes
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
describe("listAgents", () => {
  it("devuelve lista de agentes", async () => {
    mockFetch(200, { items: [{ id: "ag1", name: "Ana" }], nextPage: null });
    const result = await listAgents(conn);
    expect(result.items).toHaveLength(1);
  });
});

describe("getAgent", () => {
  it("devuelve ok=true", async () => {
    mockFetch(200, { id: "ag1", name: "Ana", email: "ana@ejemplo.com" });
    const result = await getAgent(conn, "ag1");
    expect(result.ok).toBe(true);
  });
});

describe("createAgent", () => {
  it("envia POST /agents con nombre y email", async () => {
    const stub = makeStub({ id: "ag2", name: "Carlos" }, 201);
    vi.stubGlobal("fetch", stub);
    const result = await createAgent(conn, { name: "Carlos", email: "carlos@ejemplo.com" });
    expect(result.ok).toBe(true);
    const body = JSON.parse(stub.mock.calls[0][1].body);
    expect(body.email).toBe("carlos@ejemplo.com");
  });
});

describe("updateAgent", () => {
  it("envia PATCH /agents/:id", async () => {
    const stub = makeStub({ id: "ag1", name: "Ana M." });
    vi.stubGlobal("fetch", stub);
    await updateAgent(conn, "ag1", { name: "Ana M." });
    expect(stub.mock.calls[0][1].method).toBe("PATCH");
  });
});

describe("deleteAgent", () => {
  it("envÃ­a DELETE /agents/:id", async () => {
    const stub = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ deleted: true }) });
    vi.stubGlobal("fetch", stub);
    await deleteAgent(conn, "ag1");
    expect(stub.mock.calls[0][1].method).toBe("DELETE");
  });
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Plantillas WA
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
describe("listWaTemplates", () => {
  it("devuelve arreglo de plantillas", async () => {
    mockFetch(200, [{ id: "t1", name: "bienvenida", status: "APPROVED" }]);
    const templates = await listWaTemplates(conn);
    expect(templates).toHaveLength(1);
    expect(templates[0].status).toBe("APPROVED");
  });
});

describe("getWaTemplate", () => {
  it("devuelve ok=true", async () => {
    mockFetch(200, { id: "t1", name: "bienvenida", status: "APPROVED" });
    const result = await getWaTemplate(conn, "bienvenida");
    expect(result.ok).toBe(true);
  });
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Notificaciones / CampaÃ±as
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
describe("sendNotification", () => {
  it("envia POST /notifications con recipients", async () => {
    const stub = makeStub({ notificationId: "n1", queued: 3 });
    vi.stubGlobal("fetch", stub);
    const result = await sendNotification(conn, {
      ruleNameOrId: "promo_verano",
      chatChannelNumber: "5411XXXXXXXX",
      recipients: [
        { platformContactId: "5491100001111" },
        { platformContactId: "5491100002222" },
        { platformContactId: "5491100003333" },
      ],
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.queued).toBe(3);
    const body = JSON.parse(stub.mock.calls[0][1].body);
    expect(body.recipients).toHaveLength(3);
  });
});

describe("listNotifications", () => {
  it("devuelve lista de notificaciones", async () => {
    mockFetch(200, { items: [{ notificationId: "n1" }], nextPage: null });
    const page = await listNotifications(conn);
    expect(page.items).toHaveLength(1);
  });
});

describe("cancelNotification", () => {
  it("envÃ­a DELETE /notifications/:id", async () => {
    const stub = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ cancelled: true }) });
    vi.stubGlobal("fetch", stub);
    await cancelNotification(conn, "n1");
    expect(stub.mock.calls[0][1].method).toBe("DELETE");
    expect(stub.mock.calls[0][0]).toContain("n1");
  });
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Webhooks
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
describe("listWebhooks", () => {
  it("devuelve lista de webhooks", async () => {
    mockFetch(200, [{ id: "wh1", url: "https://mi-servidor.com/bm-hook" }]);
    const result = await listWebhooks(conn);
    expect(result).toHaveLength(1);
  });
});

describe("createWebhook", () => {
  it("envia POST /webhooks con url y events", async () => {
    const stub = makeStub({ id: "wh2", url: "https://mi-servidor.com/bm-hook" }, 201);
    vi.stubGlobal("fetch", stub);
    const result = await createWebhook(conn, {
      url: "https://mi-servidor.com/bm-hook",
      events: ["message.received", "chat.closed"],
    });
    expect(result.ok).toBe(true);
    const body = JSON.parse(stub.mock.calls[0][1].body);
    expect(body.events).toHaveLength(2);
  });
});

describe("deleteWebhook", () => {
  it("envÃ­a DELETE /webhooks/:id", async () => {
    const stub = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ deleted: true }) });
    vi.stubGlobal("fetch", stub);
    await deleteWebhook(conn, "wh1");
    expect(stub.mock.calls[0][1].method).toBe("DELETE");
  });
});

describe("verifyWebhookSignature", () => {
  it("devuelve true para firma vÃ¡lida", async () => {
    // Generar firma real usando WebCrypto para un secret conocido
    const secret = "mi-secreto";
    const payload = JSON.stringify({ event: "message.received" });
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const sigBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
    const hex = Array.from(new Uint8Array(sigBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");

    const result = await verifyWebhookSignature(payload, secret, hex);
    expect(result).toBe(true);
  });

  it("devuelve false para firma invÃ¡lida", async () => {
    const result = await verifyWebhookSignature("body", "secret", "firma-incorrecta");
    expect(result).toBe(false);
  });
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Constantes exportadas
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
describe("BM_WEBHOOK_EVENTS", () => {
  it("contiene al menos 5 eventos", () => {
    expect(BM_WEBHOOK_EVENTS.length).toBeGreaterThanOrEqual(5);
  });

  it("incluye message.received", () => {
    expect(BM_WEBHOOK_EVENTS).toContain("message.received");
  });

  it("incluye chat.closed", () => {
    expect(BM_WEBHOOK_EVENTS).toContain("chat.closed");
  });
});

