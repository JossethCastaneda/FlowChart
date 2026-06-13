import { describe, it, expect, vi, beforeEach } from "vitest";

// Prisma mockeado: ninguna consulta real toca BD. Probamos el scoping/ownership
// de la capa servidor (resolveProjectScope / scopeFromRequest / getConfiguredProjectChannels).
vi.mock("@/lib/prisma", () => ({
  default: {
    project: { findFirst: vi.fn() },
    integration: { findMany: vi.fn() },
  },
}));

import prisma from "@/lib/prisma";
import {
  resolveProjectScope,
  scopeFromRequest,
  getConfiguredProjectChannels,
} from "../lib/analytics/project-scope.server";

const p = prisma as unknown as {
  project: { findFirst: ReturnType<typeof vi.fn> };
  integration: { findMany: ReturnType<typeof vi.fn> };
};

beforeEach(() => {
  p.project.findFirst.mockReset();
  p.integration.findMany.mockReset();
});

describe("seguridad: scoping obligatorio por proyecto", () => {
  // #2 + never-allow: "consultar datos de otro proyecto/workspace por cambiar projectId"
  it("proyecto que no es del workspace → null (no hay fuga cross-tenant)", async () => {
    // findFirst con where {id, workspaceId} no encuentra → null
    p.project.findFirst.mockResolvedValue(null);
    const scope = await resolveProjectScope("ws-real", "proj-de-otro-workspace");
    expect(scope).toBeNull();

    const sp = new URLSearchParams("projectId=proj-de-otro-workspace");
    const res = await scopeFromRequest(sp, "ws-real");
    expect(res.ok).toBe(false); // la ruta debe responder 404
  });

  // workspaceId SIEMPRE viene del argumento (sesión), nunca del query
  it("el workspaceId del query NO se usa para resolver el proyecto", async () => {
    p.project.findFirst.mockResolvedValue({
      id: "p1", whatsapp: ["x"], instagram: [], fanpage: [],
      channels: [], crmIntegrationId: null, crmIntegrationIds: [],
    });
    p.integration.findMany.mockResolvedValue([]);

    const sp = new URLSearchParams("projectId=p1&workspaceId=EVIL_TENANT");
    await scopeFromRequest(sp, "ws-real");

    // findFirst se llamó con el workspace de la sesión, no con EVIL_TENANT
    const callArg = p.project.findFirst.mock.calls[0][0];
    expect(callArg.where.workspaceId).toBe("ws-real");
    expect(callArg.where.id).toBe("p1");
  });

  // #4 + never-allow: "consultar integraciones de otro cliente"
  it("solo resuelve integraciones del proyecto Y del workspace", async () => {
    p.project.findFirst.mockResolvedValue({
      id: "p1", whatsapp: [], instagram: [], fanpage: [],
      channels: [],
      crmIntegrationId: null,
      crmIntegrationIds: ["int-del-proyecto", "int-ajena"],
    });
    // La BD solo devuelve la integración que además pertenece al workspace.
    p.integration.findMany.mockResolvedValue([{ provider: "botmaker" }]);

    const scope = await resolveProjectScope("ws-real", "p1");
    expect(scope?.providers).toEqual(["botmaker"]);

    // El filtro restringe por ids del proyecto Y por workspaceId.
    const intArg = p.integration.findMany.mock.calls[0][0];
    expect(intArg.where.id).toEqual({ in: ["int-del-proyecto", "int-ajena"] });
    expect(intArg.where.workspaceId).toBe("ws-real");
  });

  // #5 + never-allow: "consultar canales no configurados"
  it("getConfiguredProjectChannels solo devuelve canales configurados y soportados", async () => {
    p.project.findFirst.mockResolvedValue({
      whatsapp: ["+52..."],
      instagram: [],
      fanpage: [],
      channels: [{ type: "WHATSAPP" }, { type: "META" }, { type: "GOOGLE" }],
    });
    const channels = await getConfiguredProjectChannels("p1", "ws-real");
    expect(channels).toEqual(["whatsapp"]); // META/GOOGLE excluidos; instagram/facebook no configurados

    const callArg = p.project.findFirst.mock.calls[0][0];
    expect(callArg.where.workspaceId).toBe("ws-real");
  });

  it("getConfiguredProjectChannels de proyecto ajeno → [] (sin fuga)", async () => {
    p.project.findFirst.mockResolvedValue(null);
    expect(await getConfiguredProjectChannels("pX", "ws-real")).toEqual([]);
  });

  // Sin projectId → alcance global (la sección de proyecto SIEMPRE manda projectId)
  it("sin projectId → ok con scope null (comportamiento global)", async () => {
    const res = await scopeFromRequest(new URLSearchParams(""), "ws-real");
    expect(res).toEqual({ ok: true, scope: null });
    expect(p.project.findFirst).not.toHaveBeenCalled();
  });
});
