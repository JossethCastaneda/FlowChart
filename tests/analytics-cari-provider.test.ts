import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  normalizeIntegrationProvider,
  deriveNormalizedProviders,
} from "../lib/analytics/project-scope";

describe("normalizeIntegrationProvider: aliases/case de Cari AI", () => {
  it("resuelve la forma canónica y aliases a cari_ai", () => {
    for (const v of ["cari", "cari_ai", "Cari", "CARI", "CARI_AI", "Cari AI", "cari-ai", "cariai", "  cari  "]) {
      expect(normalizeIntegrationProvider(v)).toBe("cari_ai");
    }
  });
  it("resuelve Botmaker tolerando mayúsculas/separadores", () => {
    for (const v of ["botmaker", "BotMaker", "BOTMAKER", "bot_maker", "bot-maker"]) {
      expect(normalizeIntegrationProvider(v)).toBe("botmaker");
    }
  });
  it("NO asume que custom_crm/otros sean Cari (sin inventar) → null", () => {
    for (const v of ["custom_crm", "hubspot", "meta", "google", "", null, undefined]) {
      expect(normalizeIntegrationProvider(v as unknown)).toBeNull();
    }
  });
  it("deriveNormalizedProviders deduplica y descarta no analíticos", () => {
    expect(deriveNormalizedProviders(["cari", "CARI_AI", "custom_crm", "botmaker"]).sort()).toEqual(["botmaker", "cari_ai"]);
    expect(deriveNormalizedProviders(["custom_crm"])).toEqual([]);
  });
});

// --- resolveProjectScope con prisma mockeado --------------------------------

vi.mock("@/lib/prisma", () => ({
  default: {
    project: { findFirst: vi.fn() },
    integration: { findMany: vi.fn() },
  },
}));

import prisma from "@/lib/prisma";
import { resolveProjectScope } from "../lib/analytics/project-scope.server";

const p = prisma as unknown as {
  project: { findFirst: ReturnType<typeof vi.fn> };
  integration: { findMany: ReturnType<typeof vi.fn> };
};

beforeEach(() => {
  p.project.findFirst.mockReset();
  p.integration.findMany.mockReset();
});

describe("empty state 'Sin integraciones de analytics': causa raíz", () => {
  it("proyecto con canal pero SIN integración asociada → channels presentes, providers [] (empty state correcto)", async () => {
    p.project.findFirst.mockResolvedValue({
      id: "p1", whatsapp: ["+52..."], instagram: [], fanpage: [],
      channels: [], crmIntegrationId: null, crmIntegrationIds: [],
    });
    const scope = await resolveProjectScope("ws-1", "p1");
    expect(scope?.channels).toEqual(["whatsapp"]); // canal sí resuelve
    expect(scope?.providers).toEqual([]); // sin integración → empty state
    expect(p.integration.findMany).not.toHaveBeenCalled(); // no hay ids que buscar
  });

  it("proyecto con integración Cari asociada → providers incluye cari_ai", async () => {
    p.project.findFirst.mockResolvedValue({
      id: "p1", whatsapp: ["+52..."], instagram: [], fanpage: [],
      channels: [], crmIntegrationId: null, crmIntegrationIds: ["int-cari"],
    });
    p.integration.findMany.mockResolvedValue([{ provider: "cari" }]);
    const scope = await resolveProjectScope("ws-1", "p1");
    expect(scope?.providers).toEqual(["cari_ai"]);
  });

  it("integración Cari guardada con alias no canónico (CARI_AI) → providers incluye cari_ai", async () => {
    p.project.findFirst.mockResolvedValue({
      id: "p1", whatsapp: ["+52..."], instagram: [], fanpage: [],
      channels: [], crmIntegrationId: "int-cari", crmIntegrationIds: [],
    });
    p.integration.findMany.mockResolvedValue([{ provider: "CARI_AI" }]);
    const scope = await resolveProjectScope("ws-1", "p1");
    expect(scope?.providers).toEqual(["cari_ai"]);
  });

  it("integración de OTRO workspace no se acepta (defensa multi-tenant)", async () => {
    p.project.findFirst.mockResolvedValue({
      id: "p1", whatsapp: ["+52..."], instagram: [], fanpage: [],
      channels: [], crmIntegrationId: null, crmIntegrationIds: ["int-cari-ajena"],
    });
    // La BD filtra por workspaceId → la integración ajena no vuelve.
    p.integration.findMany.mockResolvedValue([]);
    const scope = await resolveProjectScope("ws-1", "p1");
    expect(scope?.providers).toEqual([]);
    // El findMany se acotó por el workspace de la sesión, no por otro.
    const arg = p.integration.findMany.mock.calls[0][0];
    expect(arg.where.workspaceId).toBe("ws-1");
    expect(arg.where.id).toEqual({ in: ["int-cari-ajena"] });
  });
});
