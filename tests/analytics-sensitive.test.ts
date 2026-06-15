import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveViewSensitive } from "../lib/analytics/sensitive";
import { DEFAULT_MEMBER_PERMS } from "../lib/workflow-config";

describe("view_sensitive: resolución pura", () => {
  it("OWNER y ADMIN siempre pueden ver PII", () => {
    expect(resolveViewSensitive("OWNER", DEFAULT_MEMBER_PERMS)).toBe(true);
    expect(resolveViewSensitive("ADMIN", DEFAULT_MEMBER_PERMS)).toBe(true);
  });

  it("MEMBER por defecto NO puede (enmascarado seguro)", () => {
    expect(resolveViewSensitive("MEMBER", DEFAULT_MEMBER_PERMS)).toBe(false);
  });

  it("MEMBER con el flag explícito SÍ puede", () => {
    expect(resolveViewSensitive("MEMBER", { ...DEFAULT_MEMBER_PERMS, canViewSensitiveAnalytics: true })).toBe(true);
  });

  it("canAccessAnalytics NO concede ver PII (permiso separado)", () => {
    const perms = { ...DEFAULT_MEMBER_PERMS, canAccessAnalytics: true, canViewSensitiveAnalytics: false };
    expect(resolveViewSensitive("MEMBER", perms)).toBe(false);
  });
});

vi.mock("@/lib/prisma", () => ({
  default: {
    workspaceMember: { findUnique: vi.fn() },
    workspaceSettings: { findUnique: vi.fn() },
  },
}));

import prisma from "@/lib/prisma";
import { canViewSensitive } from "../lib/analytics/sensitive";

const p = prisma as unknown as {
  workspaceMember: { findUnique: ReturnType<typeof vi.fn> };
  workspaceSettings: { findUnique: ReturnType<typeof vi.fn> };
};

beforeEach(() => {
  p.workspaceMember.findUnique.mockReset();
  p.workspaceSettings.findUnique.mockReset();
});

describe("view_sensitive: autorización (prisma mockeado)", () => {
  it("no-miembro del workspace → false (sin fuga)", async () => {
    p.workspaceMember.findUnique.mockResolvedValue(null);
    expect(await canViewSensitive("ws-1", "u-extern")).toBe(false);
  });

  it("OWNER → true sin necesitar settings", async () => {
    p.workspaceMember.findUnique.mockResolvedValue({ role: "OWNER", permissions: null });
    expect(await canViewSensitive("ws-1", "u-owner")).toBe(true);
    expect(p.workspaceSettings.findUnique).not.toHaveBeenCalled();
  });

  it("MEMBER sin permiso granular → false (enmascarado)", async () => {
    p.workspaceMember.findUnique.mockResolvedValue({ role: "MEMBER", permissions: null });
    p.workspaceSettings.findUnique.mockResolvedValue(null);
    expect(await canViewSensitive("ws-1", "u-member")).toBe(false);
  });

  it("MEMBER con permiso granular canViewSensitiveAnalytics → true", async () => {
    p.workspaceMember.findUnique.mockResolvedValue({
      role: "MEMBER",
      permissions: { ...DEFAULT_MEMBER_PERMS, canViewSensitiveAnalytics: true },
    });
    p.workspaceSettings.findUnique.mockResolvedValue(null);
    expect(await canViewSensitive("ws-1", "u-member")).toBe(true);
    // El workspaceId usado es el de la sesión (argumento), nunca otro.
    expect(p.workspaceMember.findUnique.mock.calls[0][0].where.workspaceId_userId.workspaceId).toBe("ws-1");
  });
});
