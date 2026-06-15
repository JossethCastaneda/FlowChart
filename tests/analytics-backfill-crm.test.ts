import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  default: {
    project: { findMany: vi.fn(), update: vi.fn() },
    integration: { findMany: vi.fn() },
  },
}));

import prisma from "@/lib/prisma";
import { backfillProjectCrmIntegrations } from "../lib/analytics/backfill-crm";

const p = prisma as unknown as {
  project: { findMany: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  integration: { findMany: ReturnType<typeof vi.fn> };
};

beforeEach(() => {
  p.project.findMany.mockReset();
  p.project.update.mockReset();
  p.integration.findMany.mockReset();
});

describe("backfillProjectCrmIntegrations", () => {
  it("dry-run: asocia integración Cari conectada SIN escribir", async () => {
    p.project.findMany
      .mockResolvedValueOnce([]) // paso 1 (legacy): ninguno
      .mockResolvedValueOnce([{ id: "p1", name: "P1", workspaceId: "ws1", crmIntegrationId: null, crmIntegrationIds: [] }]);
    p.integration.findMany.mockResolvedValueOnce([{ id: "int-cari", provider: "cari" }]); // wsIntegrations conectadas

    const s = await backfillProjectCrmIntegrations({ projectId: "p1", workspaceId: "ws1", apply: false });
    expect(s.apply).toBe(false);
    expect(s.associated).toBe(1);
    expect(s.changes[0]).toMatchObject({ action: "associate", after: ["int-cari"], providers: ["cari_ai"] });
    expect(p.project.update).not.toHaveBeenCalled(); // dry-run no escribe
    // Defensa tenant: las integraciones se buscan por el workspace del proyecto.
    expect(p.integration.findMany.mock.calls[0][0].where.workspaceId).toBe("ws1");
  });

  it("apply: escribe crmIntegrationIds con la integración asociada", async () => {
    p.project.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "p1", name: "P1", workspaceId: "ws1", crmIntegrationId: null, crmIntegrationIds: [] }]);
    p.integration.findMany.mockResolvedValueOnce([{ id: "int-cari", provider: "Cari AI" }]); // alias tolerado

    const s = await backfillProjectCrmIntegrations({ projectId: "p1", workspaceId: "ws1", apply: true });
    expect(s.associated).toBe(1);
    expect(p.project.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { crmIntegrationIds: ["int-cari"], crmIntegrationId: "int-cari" },
    });
  });

  it("idempotente: proyecto ya resuelto → already_ok, no asocia ni escribe", async () => {
    p.project.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "p1", name: "P1", workspaceId: "ws1", crmIntegrationId: null, crmIntegrationIds: ["int-cari"] }]);
    // linked query (current tiene ids) → resuelve cari_ai
    p.integration.findMany.mockResolvedValueOnce([{ provider: "cari" }]);

    const s = await backfillProjectCrmIntegrations({ projectId: "p1", workspaceId: "ws1", apply: true });
    expect(s.associated).toBe(0);
    expect(s.changes[0]).toMatchObject({ action: "already_ok", providers: ["cari_ai"] });
    expect(p.project.update).not.toHaveBeenCalled();
  });

  it("sin integración analítica conectada → skip_no_candidates", async () => {
    p.project.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "p1", name: "P1", workspaceId: "ws1", crmIntegrationId: null, crmIntegrationIds: [] }]);
    p.integration.findMany.mockResolvedValueOnce([{ id: "int-meta", provider: "meta" }]); // no analítica

    const s = await backfillProjectCrmIntegrations({ projectId: "p1", workspaceId: "ws1", apply: true });
    expect(s.associated).toBe(0);
    expect(s.changes[0].action).toBe("skip_no_candidates");
    expect(p.project.update).not.toHaveBeenCalled();
  });

  it("migración legacy crmIntegrationId → crmIntegrationIds (apply)", async () => {
    p.project.findMany
      .mockResolvedValueOnce([{ id: "p1", name: "P1", crmIntegrationId: "int-legacy" }]) // paso 1
      .mockResolvedValueOnce([]); // paso 2 sin proyectos
    const s = await backfillProjectCrmIntegrations({ projectId: "p1", workspaceId: "ws1", apply: true });
    expect(s.legacyMigrated).toBe(1);
    expect(p.project.update).toHaveBeenCalledWith({ where: { id: "p1" }, data: { crmIntegrationIds: ["int-legacy"] } });
  });
});
