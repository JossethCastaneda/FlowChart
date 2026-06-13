import { describe, it, expect } from "vitest";
import {
  WorkflowConfigSchema,
  parseWorkflow,
  getPermissions,
  DEFAULT_MEMBER_PERMS,
  DEFAULT_LEADER_PERMS,
  DEFAULT_EXTERNAL_PERMS,
  type Area,
} from "@/lib/workflow-config";

const validArea = {
  id: "design",
  name: "Diseño",
  color: "#f472b6",
  slaHours: 48,
  leadIds: ["lead-1"],
  memberIds: ["member-1"],
  requestTypes: [{ id: "static", name: "Creativo estático", slaHours: 24 }],
};

describe("WorkflowConfigSchema (validación de escritura)", () => {
  it("acepta un payload válido", () => {
    const r = WorkflowConfigSchema.safeParse({
      areas: [validArea],
      requireLeadReview: false,
    });
    expect(r.success).toBe(true);
  });

  it("aplica default requireLeadReview=true", () => {
    const r = WorkflowConfigSchema.parse({ areas: [] });
    expect(r.requireLeadReview).toBe(true);
  });

  it("rechaza áreas sin nombre", () => {
    const r = WorkflowConfigSchema.safeParse({
      areas: [{ ...validArea, name: "" }],
    });
    expect(r.success).toBe(false);
  });

  it("rechaza slaHours negativos o no numéricos", () => {
    expect(
      WorkflowConfigSchema.safeParse({ areas: [{ ...validArea, slaHours: -5 }] }).success
    ).toBe(false);
    expect(
      WorkflowConfigSchema.safeParse({ areas: [{ ...validArea, slaHours: "24" }] }).success
    ).toBe(false);
  });

  it("rechaza permissions incompletos", () => {
    const r = WorkflowConfigSchema.safeParse({
      areas: [
        {
          ...validArea,
          permissions: { members: { canAccessOps: true }, external: DEFAULT_EXTERNAL_PERMS },
        },
      ],
    });
    expect(r.success).toBe(false);
  });
});

describe("parseWorkflow (normalización de lectura)", () => {
  it("normaliza filas históricas con campos faltantes", () => {
    const cfg = parseWorkflow({ areas: [{ id: "x", name: "X" }] });
    expect(cfg.areas[0].slaHours).toBe(24);
    expect(cfg.areas[0].leadIds).toEqual([]);
    expect(cfg.requireLeadReview).toBe(true);
  });

  it("devuelve config vacía ante datos basura", () => {
    expect(parseWorkflow(null).areas).toEqual([]);
    expect(parseWorkflow({ areas: "no-array" }).areas).toEqual([]);
  });
});

describe("getPermissions", () => {
  const area: Area = {
    ...validArea,
    permissions: {
      leaders: { ...DEFAULT_LEADER_PERMS },
      members: { ...DEFAULT_MEMBER_PERMS, canAccessAds: false },
      external: { ...DEFAULT_EXTERNAL_PERMS },
    },
  };

  it("OWNER/ADMIN tienen acceso total", () => {
    expect(getPermissions(area, "anyone", "OWNER").canAccessAds).toBe(true);
    expect(getPermissions(area, "anyone", "ADMIN").canAccessAds).toBe(true);
  });

  it("lead del área usa permissions.leaders (configurable)", () => {
    // With DEFAULT_LEADER_PERMS (all true), lead has full access
    expect(getPermissions(area, "lead-1", "MEMBER").canAccessAds).toBe(true);
    // If leaders permissions restrict canAccessAds, lead loses access
    const restrictedArea: Area = {
      ...area,
      permissions: { ...area.permissions!, leaders: { ...DEFAULT_LEADER_PERMS, canAccessAds: false } },
    };
    expect(getPermissions(restrictedArea, "lead-1", "MEMBER").canAccessAds).toBe(false);
  });

  it("miembro del área usa permissions.members", () => {
    expect(getPermissions(area, "member-1", "MEMBER").canAccessAds).toBe(false);
    expect(getPermissions(area, "member-1", "MEMBER").canAccessOps).toBe(true);
  });

  it("externo usa permissions.external", () => {
    expect(getPermissions(area, "outsider", "MEMBER").canAccessPublisher).toBe(false);
    expect(getPermissions(area, "outsider", "MEMBER").canAccessOps).toBe(true);
  });

  it("sin área configurada → acceso completo", () => {
    expect(getPermissions(null, "anyone", "MEMBER")).toEqual(DEFAULT_MEMBER_PERMS);
  });
});
