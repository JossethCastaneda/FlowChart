import { describe, it, expect } from "vitest";
import { buildConversationWhere, parseFilters } from "../lib/analytics/query";
import {
  deriveProjectChannels,
  deriveNormalizedProviders,
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
