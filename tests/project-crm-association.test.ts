import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: {
    project: { findFirst: vi.fn() },
    integration: { findMany: vi.fn() },
  },
}));

import prisma from "@/lib/prisma";
import { resolveProjectCrmAssociation, sanitizeWorkspaceIntegrationIds, persistableCrmType } from "../lib/projects/crm";
import { resolveProjectScope } from "../lib/analytics/project-scope.server";

const p = prisma as unknown as {
  project: { findFirst: ReturnType<typeof vi.fn> };
  integration: { findMany: ReturnType<typeof vi.fn> };
};

beforeEach(() => {
  p.project.findFirst.mockReset();
  p.integration.findMany.mockReset();
});

describe("escritura: asociación CRM saneada por workspace", () => {
  it("WhatsApp + Botmaker → guarda crmIntegrationIds (legacy en sync)", async () => {
    p.integration.findMany.mockResolvedValue([{ id: "int-bm" }]);
    const crm = await resolveProjectCrmAssociation("ws1", { crmIntegrationIds: ["int-bm"] });
    expect(crm).toEqual({ crmIntegrationIds: ["int-bm"], crmIntegrationId: "int-bm" });
  });

  it("WhatsApp + Cari → guarda crmIntegrationIds", async () => {
    p.integration.findMany.mockResolvedValue([{ id: "int-cari" }]);
    const crm = await resolveProjectCrmAssociation("ws1", { crmIntegrationId: "int-cari" });
    expect(crm).toEqual({ crmIntegrationIds: ["int-cari"], crmIntegrationId: "int-cari" });
  });

  it("integración de OTRO workspace NO se puede asociar (se descarta)", async () => {
    // La BD filtra por workspaceId → la integración ajena no vuelve.
    p.integration.findMany.mockResolvedValue([]);
    const crm = await resolveProjectCrmAssociation("ws1", { crmIntegrationIds: ["int-de-otro-ws"] });
    expect(crm).toEqual({ crmIntegrationIds: [], crmIntegrationId: null });
    const where = p.integration.findMany.mock.calls[0][0].where;
    expect(where.workspaceId).toBe("ws1");
    expect(where.id).toEqual({ in: ["int-de-otro-ws"] });
  });

  it("sanitize deduplica y conserva orden", async () => {
    p.integration.findMany.mockResolvedValue([{ id: "a" }, { id: "b" }]);
    expect(await sanitizeWorkspaceIntegrationIds("ws1", ["a", "b", "a", "x"])).toEqual(["a", "b"]);
  });
});

describe("persistableCrmType: conserva sentinels sin integración", () => {
  it("botmaker/cari CON integración válida → se conserva", () => {
    expect(persistableCrmType("botmaker", true)).toBe("botmaker");
    expect(persistableCrmType("cari", true)).toBe("cari");
  });

  it("botmaker/cari SIN integración → null (no deja analítica fantasma)", () => {
    expect(persistableCrmType("botmaker", false)).toBeNull();
    expect(persistableCrmType("cari", false)).toBeNull();
  });

  it("google SIN integración → se conserva (su analítica vive en Análisis de Tráfico)", () => {
    expect(persistableCrmType("google", false)).toBe("google");
  });

  it("no_aplica SIN integración → se conserva (elección explícita de sin bot)", () => {
    expect(persistableCrmType("no_aplica", false)).toBe("no_aplica");
  });

  it("vacío/null → null", () => {
    expect(persistableCrmType("", false)).toBeNull();
    expect(persistableCrmType(null, true)).toBeNull();
    expect(persistableCrmType(undefined, true)).toBeNull();
  });
});

describe("lectura: dashboard por proyecto resuelve el provider correcto", () => {
  function mockProject(over: Record<string, unknown>) {
    p.project.findFirst.mockResolvedValue({
      id: "p1", whatsapp: ["+52..."], instagram: [], fanpage: [], channels: [],
      crmIntegrationId: null, crmIntegrationIds: [], ...over,
    });
  }

  it("WhatsApp + Botmaker asociado → providers incluye botmaker", async () => {
    mockProject({ crmIntegrationIds: ["int-bm"] });
    p.integration.findMany.mockResolvedValue([{ provider: "botmaker" }]);
    const scope = await resolveProjectScope("ws1", "p1");
    expect(scope?.channels).toEqual(["whatsapp"]);
    expect(scope?.providers).toEqual(["botmaker"]);
  });

  it("WhatsApp + Cari asociado → providers incluye cari_ai", async () => {
    mockProject({ crmIntegrationIds: ["int-cari"] });
    p.integration.findMany.mockResolvedValue([{ provider: "cari" }]);
    const scope = await resolveProjectScope("ws1", "p1");
    expect(scope?.providers).toEqual(["cari_ai"]);
  });

  it("WhatsApp SIN provider → channels presentes, providers [] (empty state correcto)", async () => {
    mockProject({ crmIntegrationIds: [] });
    const scope = await resolveProjectScope("ws1", "p1");
    expect(scope?.channels).toEqual(["whatsapp"]);
    expect(scope?.providers).toEqual([]);
    expect(p.integration.findMany).not.toHaveBeenCalled();
  });

  it("CRM Custom NO se trata como Cari → providers []", async () => {
    mockProject({ crmIntegrationIds: ["int-custom"] });
    p.integration.findMany.mockResolvedValue([{ provider: "custom_crm" }]);
    const scope = await resolveProjectScope("ws1", "p1");
    expect(scope?.providers).toEqual([]);
  });
});
