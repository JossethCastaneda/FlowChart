import { describe, it, expect } from "vitest";
import { buildConversationWhere, buildProjectAnalyticsWhere, parseFilters } from "../lib/analytics/query";
import {
  deriveProjectChannels,
  collectProjectChannels,
  deriveNormalizedProviders,
  normalizeChannelName,
  SUPPORTED_CHANNELS,
  INTEGRATION_TO_NORMALIZED_PROVIDER,
  type ProjectScope,
} from "../lib/analytics/project-scope";

const filters = parseFilters(new URLSearchParams("days=28"));

// ── Derivación de canales configurados (goal §4/§5) ──────────────────────────
describe("deriveProjectChannels", () => {
  it("mapea cuentas sociales a canales canónicos", () => {
    expect(deriveProjectChannels({ whatsapp: ["+52..."], instagram: [], fanpage: [] })).toEqual(["whatsapp"]);
    expect(deriveProjectChannels({ whatsapp: [], instagram: ["@x"], fanpage: [] })).toEqual(["instagram"]);
  });

  it("una fanpage de Facebook habilita facebook + messenger", () => {
    const ch = deriveProjectChannels({ whatsapp: [], instagram: [], fanpage: ["Mi Página"] });
    expect(ch).toContain("facebook");
    expect(ch).toContain("messenger");
  });

  it("sin cuentas configuradas → ningún canal (empty state)", () => {
    expect(deriveProjectChannels({ whatsapp: [], instagram: [], fanpage: [] })).toEqual([]);
    expect(deriveProjectChannels({})).toEqual([]);
  });

  it("combina todos los canales configurados sin duplicar", () => {
    const ch = deriveProjectChannels({ whatsapp: ["a"], instagram: ["b"], fanpage: ["c"] });
    expect(ch.sort()).toEqual(["facebook", "instagram", "messenger", "whatsapp"]);
  });
});

// ── normalizeChannelName: aliases de proveedor → canónico ────────────────────
describe("normalizeChannelName", () => {
  it("admite los 5 canales canónicos (incluye webchat)", () => {
    expect(SUPPORTED_CHANNELS).toEqual(["whatsapp", "instagram", "facebook", "messenger", "webchat"]);
  });

  it("WhatsApp: acepta sus aliases", () => {
    for (const a of ["whatsapp", "whats_app", "wa", "waba", "whatsapp_business", "WhatsApp Business", "WABA"]) {
      expect(normalizeChannelName(a)).toBe("whatsapp");
    }
  });

  it("Instagram: acepta sus aliases", () => {
    for (const a of ["instagram", "instagram_dm", "instagram_direct", "ig", "ig_dm", "Instagram Direct", "IG"]) {
      expect(normalizeChannelName(a)).toBe("instagram");
    }
  });

  it("Facebook: acepta sus aliases", () => {
    for (const a of ["facebook", "facebook_page", "facebook_comments", "fb", "fb_page", "FB Page"]) {
      expect(normalizeChannelName(a)).toBe("facebook");
    }
  });

  it("Messenger: acepta sus aliases", () => {
    for (const a of ["messenger", "facebook_messenger", "fb_messenger", "meta_messenger", "FB Messenger"]) {
      expect(normalizeChannelName(a)).toBe("messenger");
    }
  });

  it("Web Chat: acepta sus aliases", () => {
    for (const a of ["webchat", "web_chat", "web", "widget", "Web Chat", "WEBCHAT", "website_chat"]) {
      expect(normalizeChannelName(a)).toBe("webchat");
    }
  });

  it("canales no soportados → null (se excluyen de esta vista)", () => {
    for (const a of ["telegram", "sms", "email", "meta", "google", "tiktok", "", "  "]) {
      expect(normalizeChannelName(a)).toBeNull();
    }
    expect(normalizeChannelName(undefined)).toBeNull();
    expect(normalizeChannelName(123)).toBeNull();
  });
});

// ── collectProjectChannels: lee config real (Channel rows + cuentas) ─────────
describe("collectProjectChannels", () => {
  it("lee filas Channel y las normaliza, excluyendo no soportados", () => {
    const ch = collectProjectChannels({
      channels: [{ type: "WHATSAPP" }, { type: "META" }, { type: "instagram_dm" }, { type: "GOOGLE" }],
    });
    expect(ch).toEqual(["whatsapp", "instagram"]); // META y GOOGLE excluidos
  });

  it("combina filas Channel con cuentas sociales sin duplicar", () => {
    const ch = collectProjectChannels({
      channels: [{ type: "fb_messenger" }],
      whatsapp: ["+52..."],
      fanpage: ["Mi Página"],
    });
    // whatsapp (cuenta) + facebook+messenger (fanpage) + messenger (channel) → dedup, orden canónico
    expect(ch).toEqual(["whatsapp", "facebook", "messenger"]);
  });

  it("sin nada configurado → [] (empty state)", () => {
    expect(collectProjectChannels({})).toEqual([]);
    expect(collectProjectChannels({ channels: [{ type: "telegram" }] })).toEqual([]);
  });

  it("incluye webchat desde los IDs de web chat o desde filas Channel", () => {
    expect(collectProjectChannels({ webchat: ["w-123"] })).toEqual(["webchat"]);
    expect(collectProjectChannels({ channels: [{ type: "WEBCHAT" }] })).toEqual(["webchat"]);
    // orden canónico estable con webchat al final
    expect(deriveProjectChannels({ whatsapp: ["a"], webchat: ["w-1"] })).toEqual(["whatsapp", "webchat"]);
  });

  it("devuelve siempre en orden canónico estable", () => {
    const ch = collectProjectChannels({ instagram: ["a"], whatsapp: ["b"], fanpage: ["c"] });
    expect(ch).toEqual(["whatsapp", "instagram", "facebook", "messenger"]);
  });
});

// ── collectProjectChannels acotado por plataforma analítica (provider) ───────
describe("collectProjectChannels con provider (canales por plataforma)", () => {
  const all = { whatsapp: ["+52"], instagram: ["@x"], fanpage: ["Mi Página"], webchat: ["w-1"] };

  it("Cari solo soporta whatsapp + webchat: excluye instagram/facebook/messenger", () => {
    expect(collectProjectChannels(all, "cari_ai")).toEqual(["whatsapp", "webchat"]);
  });

  it("Botmaker soporta whatsapp/instagram/facebook/messenger/webchat", () => {
    expect(collectProjectChannels(all, "botmaker")).toEqual([
      "whatsapp",
      "instagram",
      "facebook",
      "messenger",
      "webchat",
    ]);
  });

  it("sin provider mantiene comportamiento histórico (no interseca)", () => {
    expect(collectProjectChannels({ instagram: ["@x"] })).toEqual(["instagram"]);
  });

  it("provider desconocido no interseca (devuelve lo configurado)", () => {
    expect(collectProjectChannels({ instagram: ["@x"] }, "otro")).toEqual(["instagram"]);
  });
});

// ── Derivación de proveedores normalizados (goal §3) ─────────────────────────
describe("deriveNormalizedProviders", () => {
  it("mapea provider de integración a provider normalizado", () => {
    expect(INTEGRATION_TO_NORMALIZED_PROVIDER.cari).toBe("cari_ai");
    expect(deriveNormalizedProviders(["botmaker"])).toEqual(["botmaker"]);
    expect(deriveNormalizedProviders(["cari"])).toEqual(["cari_ai"]);
  });

  it("deduplica y descarta proveedores sin adaptador analítico", () => {
    expect(deriveNormalizedProviders(["cari", "cari_ai"])).toEqual(["cari_ai"]);
    expect(deriveNormalizedProviders(["meta_ads", "google"])).toEqual([]);
  });
});

// ── Acotamiento del WHERE por proyecto (goal §3/§4/§5/§10) ───────────────────
describe("buildConversationWhere con alcance de proyecto", () => {
  const scope: ProjectScope = { projectId: "p1", providers: ["botmaker"], channels: ["whatsapp", "instagram"] };

  it("restringe provider y channel a los configurados en el proyecto", () => {
    const where = buildConversationWhere("ws1", filters, scope);
    expect(where.workspaceId).toBe("ws1");
    expect(where.provider).toEqual({ in: ["botmaker"] });
    expect(where.channel).toEqual({ in: ["whatsapp", "instagram"] });
  });

  it("un canal solicitado DENTRO del alcance se aplica exacto", () => {
    const f = parseFilters(new URLSearchParams("days=28&channel=whatsapp"));
    const where = buildConversationWhere("ws1", f, scope);
    expect(where.channel).toBe("whatsapp");
  });

  it("un canal solicitado FUERA del alcance se ignora (no contamina)", () => {
    const f = parseFilters(new URLSearchParams("days=28&channel=webchat"));
    const where = buildConversationWhere("ws1", f, scope);
    // se mantiene la restricción del proyecto, nunca se expone el canal no configurado
    expect(where.channel).toEqual({ in: ["whatsapp", "instagram"] });
  });

  it("un provider solicitado FUERA del alcance se ignora", () => {
    const f = parseFilters(new URLSearchParams("days=28&provider=cari_ai"));
    const where = buildConversationWhere("ws1", f, scope);
    expect(where.provider).toEqual({ in: ["botmaker"] });
  });

  it("proyecto sin canales → channel IN [] (0 resultados, no fuga)", () => {
    const empty: ProjectScope = { projectId: "p1", providers: ["botmaker"], channels: [] };
    const where = buildConversationWhere("ws1", filters, empty);
    expect(where.channel).toEqual({ in: [] });
  });

  it("proyecto sin proveedor → provider IN [] (0 resultados, no fuga)", () => {
    const empty: ProjectScope = { projectId: "p1", providers: [], channels: ["whatsapp"] };
    const where = buildConversationWhere("ws1", filters, empty);
    expect(where.provider).toEqual({ in: [] });
  });
});

// ── Filtros globales adicionales (bot/cola/skill/estado/resuelto-por/…) ──────
describe("filtros globales en buildConversationWhere", () => {
  const scope: ProjectScope = { projectId: "p1", providers: ["botmaker"], channels: ["whatsapp"] };

  it("aplica bot, agente, cola, skill, campaña, servicio, tag, estado y resuelto-por", () => {
    const f = parseFilters(new URLSearchParams(
      "days=28&botId=b1&agentId=a1&queueName=Soporte&skill=Pagos&campaignId=c1&serviceId=s1&tag=vip&status=closed&resolvedBy=bot"
    ));
    const where = buildConversationWhere("ws1", f, scope);
    expect(where.botId).toBe("b1");
    expect(where.agentId).toBe("a1");
    expect(where.queueName).toBe("Soporte");
    expect(where.skillName).toBe("Pagos");
    expect(where.campaignId).toBe("c1");
    expect(where.serviceId).toBe("s1");
    expect(where.tags).toEqual({ has: "vip" });
    expect(where.status).toBe("closed");
    expect(where.resolvedBy).toBe("bot");
    // el alcance del proyecto sigue restringiendo provider/channel
    expect(where.provider).toEqual({ in: ["botmaker"] });
    expect(where.channel).toEqual({ in: ["whatsapp"] });
  });

  it("'skill' es alias de 'skillName' en parseFilters", () => {
    expect(parseFilters(new URLSearchParams("skill=Pagos")).skillName).toBe("Pagos");
    expect(parseFilters(new URLSearchParams("skillName=Cobros")).skillName).toBe("Cobros");
  });
});

// ── buildProjectAnalyticsWhere (builder común de rutas anidadas) ─────────────
describe("buildProjectAnalyticsWhere", () => {
  it("fija workspaceId, restringe channel/provider y aplica rango de fechas", () => {
    const f = parseFilters(new URLSearchParams("days=7"));
    const where = buildProjectAnalyticsWhere({
      workspaceId: "ws1",
      projectId: "p1",
      clientId: "ACME",
      allowedChannels: ["whatsapp", "instagram"],
      allowedProviders: ["botmaker"],
      filters: f,
    });
    expect(where.workspaceId).toBe("ws1");
    expect(where.provider).toEqual({ in: ["botmaker"] });
    expect(where.channel).toEqual({ in: ["whatsapp", "instagram"] });
    expect(where.conversationStartedAt).toEqual({ gte: f.startDate, lte: f.endDate });
  });

  it("ignora un canal pedido fuera de los configurados", () => {
    const f = parseFilters(new URLSearchParams("days=7&channel=facebook"));
    const where = buildProjectAnalyticsWhere({
      workspaceId: "ws1", projectId: "p1",
      allowedChannels: ["whatsapp"], allowedProviders: ["botmaker"], filters: f,
    });
    expect(where.channel).toEqual({ in: ["whatsapp"] });
  });

  it("sin proveedores/canales configurados → IN [] (0 filas)", () => {
    const f = parseFilters(new URLSearchParams("days=7"));
    const where = buildProjectAnalyticsWhere({
      workspaceId: "ws1", projectId: "p1", allowedChannels: [], allowedProviders: [], filters: f,
    });
    expect(where.provider).toEqual({ in: [] });
    expect(where.channel).toEqual({ in: [] });
  });
});

// ── Aislamiento multi-tenant (goal §10) ──────────────────────────────────────
describe("aislamiento multi-tenant con alcance de proyecto", () => {
  it("workspaceId siempre proviene del contexto, nunca del query", () => {
    const f = parseFilters(new URLSearchParams("days=28&workspaceId=EVIL_TENANT&projectId=EVIL"));
    const scope: ProjectScope = { projectId: "p1", providers: ["botmaker"], channels: ["whatsapp"] };
    const where = buildConversationWhere("real-ws", f, scope);
    expect(where.workspaceId).toBe("real-ws");
  });

  it("sin scope, el comportamiento global se mantiene intacto", () => {
    const where = buildConversationWhere("ws1", filters);
    expect(where.workspaceId).toBe("ws1");
    expect(where.provider).toBeUndefined();
    expect(where.channel).toBeUndefined();
  });
});
