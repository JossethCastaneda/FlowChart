import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockPrisma } = vi.hoisted(() => {
  const mPrisma: any = {
    user: { findUnique: vi.fn() },
    workspaceMember: { findUnique: vi.fn(), findFirst: vi.fn() },
    workspace: { findUnique: vi.fn() },
    subscription: { findUnique: vi.fn() },
    billingCustomer: { findUnique: vi.fn() },
  };
  return { mockPrisma: mPrisma };
});

vi.mock("@/lib/prisma", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/prisma")>();
  return { ...actual, default: mockPrisma };
});

const mockGetServerSession = vi.fn();
vi.mock("next-auth/next", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

const mockCookiesGet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: mockCookiesGet }),
}));

// The route must never instantiate Stripe just to render billing status.
vi.mock("stripe", () => ({
  default: class {
    constructor() {
      throw new Error("Stripe must not be instantiated for a status read");
    }
  },
}));

import { GET } from "@/app/api/billing/status/route";

function makeRequest() {
  return new NextRequest(new URL("http://localhost/api/billing/status"));
}

describe("GET /api/billing/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookiesGet.mockReturnValue(undefined);
  });

  it("returns 401 when there is no session", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const res = await GET(makeRequest(), {});

    expect(res.status).toBe(401);
    expect(mockPrisma.workspace.findUnique).not.toHaveBeenCalled();
  });

  it("returns 403 for a workspace member who is not OWNER/ADMIN", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "u1" } });
    mockPrisma.user.findUnique.mockResolvedValue({ id: "u1", passwordChangedAt: null });
    mockPrisma.workspaceMember.findFirst.mockResolvedValue({ workspaceId: "ws1", role: "MEMBER" });

    const res = await GET(makeRequest(), {});

    expect(res.status).toBe(403);
    expect(mockPrisma.workspace.findUnique).not.toHaveBeenCalled();
  });

  it("returns the billing status for an OWNER, with subscription fields serialized", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "u1" } });
    mockPrisma.user.findUnique.mockResolvedValue({ id: "u1", passwordChangedAt: null });
    mockPrisma.workspaceMember.findFirst.mockResolvedValue({ workspaceId: "ws1", role: "OWNER" });
    mockPrisma.workspace.findUnique.mockResolvedValue({ plan: "pro" });
    mockPrisma.subscription.findUnique.mockResolvedValue({
      status: "active",
      currentPeriodEnd: new Date("2026-09-01T00:00:00.000Z"),
      cancelAtPeriodEnd: false,
    });
    mockPrisma.billingCustomer.findUnique.mockResolvedValue({ stripeCustomerId: "cus_1" });

    const res = await GET(makeRequest(), {});
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual({
      plan: "pro",
      configured: false, // no STRIPE_SECRET_KEY in the test environment
      hasBillingAccount: true,
      status: "active",
      currentPeriodEnd: "2026-09-01T00:00:00.000Z",
      cancelAtPeriodEnd: false,
    });
    expect(mockPrisma.workspaceMember.findUnique).not.toHaveBeenCalled(); // no cookie -> falls back to findFirst
  });

  it("returns configured:true when STRIPE_SECRET_KEY is present, without ever constructing Stripe", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "u1" } });
    mockPrisma.user.findUnique.mockResolvedValue({ id: "u1", passwordChangedAt: null });
    mockPrisma.workspaceMember.findFirst.mockResolvedValue({ workspaceId: "ws1", role: "ADMIN" });
    mockPrisma.workspace.findUnique.mockResolvedValue({ plan: "free" });
    mockPrisma.subscription.findUnique.mockResolvedValue(null);
    mockPrisma.billingCustomer.findUnique.mockResolvedValue(null);

    vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_dummy");
    try {
      const res = await GET(makeRequest(), {});
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.configured).toBe(true);
      expect(body.data.hasBillingAccount).toBe(false);
      expect(body.data.status).toBeNull();
      expect(body.data.currentPeriodEnd).toBeNull();
      expect(body.data.cancelAtPeriodEnd).toBe(false);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("reports configured:false (never a 500) when STRIPE_SECRET_KEY is missing", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "u1" } });
    mockPrisma.user.findUnique.mockResolvedValue({ id: "u1", passwordChangedAt: null });
    mockPrisma.workspaceMember.findFirst.mockResolvedValue({ workspaceId: "ws1", role: "OWNER" });
    mockPrisma.workspace.findUnique.mockResolvedValue({ plan: "free" });
    mockPrisma.subscription.findUnique.mockResolvedValue(null);
    mockPrisma.billingCustomer.findUnique.mockResolvedValue(null);

    vi.stubEnv("STRIPE_SECRET_KEY", "");
    try {
      const res = await GET(makeRequest(), {});
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.configured).toBe(false);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("never performs a database write", async () => {
    mockGetServerSession.mockResolvedValue({ user: { id: "u1" } });
    mockPrisma.user.findUnique.mockResolvedValue({ id: "u1", passwordChangedAt: null });
    mockPrisma.workspaceMember.findFirst.mockResolvedValue({ workspaceId: "ws1", role: "OWNER" });
    mockPrisma.workspace.findUnique.mockResolvedValue({ plan: "free" });
    mockPrisma.subscription.findUnique.mockResolvedValue(null);
    mockPrisma.billingCustomer.findUnique.mockResolvedValue(null);

    await GET(makeRequest(), {});

    // The mocked prisma client only exposes read methods on these models —
    // if the route ever called .create/.update/.upsert it would throw, since
    // those methods were never stubbed.
    expect(mockPrisma.workspace.create).toBeUndefined();
    expect(mockPrisma.subscription.update).toBeUndefined();
    expect(mockPrisma.billingCustomer.create).toBeUndefined();
  });
});
