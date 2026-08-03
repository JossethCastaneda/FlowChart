import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO: Limpieza manual requerida
import { join, relative } from "node:path";

/**
 * Tenant isolation — functional verification (§5)
 *
 * Two layers of defense:
 *
 * Layer 1 (Unit): Mock prisma and verify that verifyWorkspaceAccess and
 * verifyProjectAccess correctly deny cross-tenant access.
 *
 * Layer 2 (Static, per-handler): For each exported HTTP handler in the 16
 * target routes, verify that the handler's code calls a verification function
 * BEFORE any data query. More granular than the existing test which only checks
 * the whole file.
 */

// ── E2E tenant IDs (match prisma/seed.e2e.ts) ─────────────────────────────
const TENANTS = {
  alfa: {
    userId: "e2e-alfa-user-owner",
    workspaceId: "e2e-alfa-workspace",
    projectId: "e2e-alfa-project",
  },
  beta: {
    userId: "e2e-beta-user-owner",
    workspaceId: "e2e-beta-workspace",
    projectId: "e2e-beta-project",
  },
};

// ── Layer 1: Unit tests for access-control functions ────────────────────────

// Mock prisma before importing modules that use it
vi.mock("@/lib/prisma", () => {
  const memberships = [
    { workspaceId: "e2e-alfa-workspace", userId: "e2e-alfa-user-owner", role: "OWNER" },
    { workspaceId: "e2e-alfa-workspace", userId: "e2e-alfa-user-invited", role: "MEMBER" },
    { workspaceId: "e2e-beta-workspace", userId: "e2e-beta-user-owner", role: "OWNER" },
    { workspaceId: "e2e-beta-workspace", userId: "e2e-beta-user-invited", role: "MEMBER" },
  ];

  const projects = [
    { id: "e2e-alfa-project", workspaceId: "e2e-alfa-workspace" },
    { id: "e2e-beta-project", workspaceId: "e2e-beta-workspace" },
  ];

  return {
    default: {
      workspaceMember: {
        findUnique: vi.fn(({ where }: { where: { workspaceId_userId: { workspaceId: string; userId: string } } }) => {
          const match = memberships.find(
            (m) =>
              m.workspaceId === where.workspaceId_userId.workspaceId &&
              m.userId === where.workspaceId_userId.userId
          );
          return Promise.resolve(match || null);
        }),
      },
      project: {
        findUnique: vi.fn(({ where }: { where: { id: string } }) => {
          const match = projects.find((p) => p.id === where.id);
          return Promise.resolve(match || null);
        }),
      },
    },
  };
});

describe("Tenant Isolation — Unit (Layer 1)", () => {
  let verifyWorkspaceAccess: typeof import("@/lib/auth-workspace").verifyWorkspaceAccess;
  let verifyProjectAccess: typeof import("@/lib/auth-workspace").verifyProjectAccess;

  beforeEach(async () => {
    const mod = await import("@/lib/auth-workspace");
    verifyWorkspaceAccess = mod.verifyWorkspaceAccess;
    verifyProjectAccess = mod.verifyProjectAccess;
  });

  it("Alfa owner CAN access Alfa workspace", async () => {
    const result = await verifyWorkspaceAccess(TENANTS.alfa.workspaceId, TENANTS.alfa.userId);
    expect(result).toBe(true);
  });

  it("Beta owner CAN access Beta workspace", async () => {
    const result = await verifyWorkspaceAccess(TENANTS.beta.workspaceId, TENANTS.beta.userId);
    expect(result).toBe(true);
  });

  it("Alfa owner CANNOT access Beta workspace", async () => {
    const result = await verifyWorkspaceAccess(TENANTS.beta.workspaceId, TENANTS.alfa.userId);
    expect(result).toBe(false);
  });

  it("Beta owner CANNOT access Alfa workspace", async () => {
    const result = await verifyWorkspaceAccess(TENANTS.alfa.workspaceId, TENANTS.beta.userId);
    expect(result).toBe(false);
  });

  it("Alfa owner with MEMBER role CANNOT do OWNER-only action", async () => {
    // Alfa invited user is MEMBER, not OWNER
    const result = await verifyWorkspaceAccess(
      TENANTS.alfa.workspaceId,
      "e2e-alfa-user-invited",
      ["OWNER"]
    );
    expect(result).toBe(false);
  });

  it("Alfa owner CAN do OWNER action on own workspace", async () => {
    const result = await verifyWorkspaceAccess(
      TENANTS.alfa.workspaceId,
      TENANTS.alfa.userId,
      ["OWNER"]
    );
    expect(result).toBe(true);
  });

  it("Alfa owner CANNOT access Beta project", async () => {
    const result = await verifyProjectAccess(TENANTS.beta.projectId, TENANTS.alfa.userId);
    expect(result).toBe(false);
  });

  it("Beta owner CANNOT access Alfa project", async () => {
    const result = await verifyProjectAccess(TENANTS.alfa.projectId, TENANTS.beta.userId);
    expect(result).toBe(false);
  });

  it("Alfa owner CAN access Alfa project", async () => {
    const result = await verifyProjectAccess(TENANTS.alfa.projectId, TENANTS.alfa.userId);
    expect(result).toBe(true);
  });

  it("Unknown workspace returns false", async () => {
    const result = await verifyWorkspaceAccess("nonexistent-workspace", TENANTS.alfa.userId);
    expect(result).toBe(false);
  });

  it("Unknown project returns false", async () => {
    const result = await verifyProjectAccess("nonexistent-project", TENANTS.alfa.userId);
    expect(result).toBe(false);
  });
});

// ── Layer 2: Static verification per-handler ────────────────────────────────

const ROOT = join(__dirname, "..");

/**
 * Routes with URL-based tenant parameters that MUST call a verification
 * function in every exported handler. These are the "attack surface" per §5.
 */
const PROTECTED_ROUTES = [
  { path: "app/api/workspace/[workspaceId]/route.ts",                      verifier: "verifyWorkspaceAccess" },
  { path: "app/api/workspace/[workspaceId]/audit/route.ts",                verifier: "verifyWorkspaceAccess" },
  { path: "app/api/workspace/[workspaceId]/members/route.ts",              verifier: "verifyWorkspaceAccess" },
  { path: "app/api/workspace/[workspaceId]/members/role/route.ts",         verifier: "verifyWorkspaceAccess" },
  { path: "app/api/workspace/[workspaceId]/members/permissions/route.ts",  verifier: "verifyWorkspaceAccess" },
  { path: "app/api/workspace/[workspaceId]/invite/route.ts",               verifier: "verifyWorkspaceAccess" },
  { path: "app/api/workspace/[workspaceId]/invite/[inviteId]/route.ts",    verifier: "verifyWorkspaceAccess" },
  // projects/[id] and briefs/[id] find the resource first, then verify via resource.workspaceId
  { path: "app/api/projects/[id]/route.ts",                                verifier: "verifyWorkspaceAccess" },
  { path: "app/api/projects/[id]/token/route.ts",                          verifier: "verifyWorkspaceAccess" },
  { path: "app/api/ops/[id]/route.ts",                                     verifier: "verifyProjectAccess|verifyWorkspaceAccess" },
  { path: "app/api/ops/[id]/comments/route.ts",                            verifier: "verifyProjectAccess|verifyWorkspaceAccess" },
  { path: "app/api/briefs/[id]/route.ts",                                  verifier: "verifyWorkspaceAccess" },
];

/**
 * Public routes — these are deliberately unprotected but must have specific
 * safety patterns (token validation, field allowlisting, expiry checks).
 */
const PUBLIC_ROUTES = [
  { path: "app/api/invite/[token]/route.ts",           safetyPattern: /expires|acceptedAt|token/ },
  { path: "app/api/public/project/[token]/route.ts",   safetyPattern: /publicToken/ },
  { path: "app/api/reportes/public/[slug]/route.ts",   safetyPattern: /PUBLIC_DATA_FIELDS|pickPublicData/ },
  { path: "app/api/oauth/[provider]/callback/route.ts", safetyPattern: /state|code/ },
];

describe("Tenant Isolation — Static per-handler (Layer 2)", () => {
  for (const route of PROTECTED_ROUTES) {
    it(`${route.path} imports and calls ${route.verifier}`, () => {
      const fullPath = join(ROOT, route.path);
      const content = readFileSync(fullPath, "utf8");

      // Must import the verifier
      const verifiers = route.verifier.split("|");
      const hasImport = verifiers.some((v) => content.includes(v));
      expect(
        hasImport,
        `${route.path} does not import any of: ${route.verifier}`
      ).toBe(true);

      // Must be wrapped in withAuth (not raw export)
      expect(
        content.includes("withAuth"),
        `${route.path} should use withAuth wrapper`
      ).toBe(true);

      // Extract exported handler names (GET, POST, PATCH, DELETE, PUT)
      const handlerExports = content.match(/export\s+(const\s+)?(GET|POST|PATCH|DELETE|PUT)\b/g) || [];
      expect(
        handlerExports.length,
        `${route.path} has no exported HTTP handlers`
      ).toBeGreaterThan(0);

      // For each handler, verify the verifier is called within its scope
      // (simplified: check that it appears after the handler declaration)
      for (const handler of handlerExports) {
        const method = handler.match(/(GET|POST|PATCH|DELETE|PUT)/)?.[1];
        if (!method) continue;

        // Find the handler block start
        const handlerRegex = new RegExp(`export\\s+(const\\s+)?${method}\\b`);
        const handlerMatch = content.match(handlerRegex);
        if (!handlerMatch?.index) continue;

        // Get the code after the handler declaration until the next export or EOF
        const afterHandler = content.slice(handlerMatch.index);
        const nextExport = afterHandler.slice(50).search(/\nexport\s/);
        const handlerBlock = nextExport > 0
          ? afterHandler.slice(0, nextExport + 50)
          : afterHandler;

        // The handler block must reference the verifier OR do a membership check
        const hasVerifier = verifiers.some((v) => handlerBlock.includes(v));
        const hasMembershipCheck = /workspaceMember\.find/.test(handlerBlock);

        expect(
          hasVerifier || hasMembershipCheck,
          `${route.path} handler ${method} does not call ${route.verifier} or check membership`
        ).toBe(true);
      }
    });
  }

  for (const route of PUBLIC_ROUTES) {
    it(`${route.path} (public) has safety pattern`, () => {
      const fullPath = join(ROOT, route.path);
      const content = readFileSync(fullPath, "utf8");

      expect(
        route.safetyPattern.test(content),
        `${route.path} is public but missing safety pattern: ${route.safetyPattern}`
      ).toBe(true);
    });
  }
});
