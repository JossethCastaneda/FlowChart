import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiFetch, apiSend, ApiError } from "@/lib/api-client";

/**
 * BillingManager (components/settings/BillingManager.tsx) talks to
 * /api/billing/{status,checkout,portal} exclusively through apiFetch/apiSend.
 * These tests pin down the exact request/response contract it relies on,
 * since app/api/billing/checkout and app/api/billing/portal return plain
 * `{ url }` bodies (no {success,data} envelope) and require workspaceId.
 */
describe("BillingManager <-> billing API contract", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("checkout: sends workspaceId and plan in the body", async () => {
    (global.fetch as any).mockResolvedValue(
      new Response(JSON.stringify({ url: "https://checkout.stripe.com/session/abc" }), { status: 200 }),
    );

    await apiSend("/api/billing/checkout", "POST", { workspaceId: "ws_1", plan: "pro" });

    const [, init] = (global.fetch as any).mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({ workspaceId: "ws_1", plan: "pro" });
  });

  it("portal: sends workspaceId (and only workspaceId) in the body", async () => {
    (global.fetch as any).mockResolvedValue(
      new Response(JSON.stringify({ url: "https://billing.stripe.com/session/xyz" }), { status: 200 }),
    );

    await apiSend("/api/billing/portal", "POST", { workspaceId: "ws_1" });

    const [, init] = (global.fetch as any).mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({ workspaceId: "ws_1" });
  });

  it("unwraps a plain { url } response without assuming payload.data.url", async () => {
    (global.fetch as any).mockResolvedValue(
      new Response(JSON.stringify({ url: "https://checkout.stripe.com/session/abc" }), { status: 200 }),
    );

    const result = await apiSend<{ url: string }>("/api/billing/checkout", "POST", { workspaceId: "ws_1", plan: "pro" });

    expect(result).toEqual({ url: "https://checkout.stripe.com/session/abc" });
  });

  it("surfaces a failed checkout/portal call as a catchable ApiError (not a silent hang)", async () => {
    (global.fetch as any).mockResolvedValue(
      new Response(JSON.stringify({ error: "No billing customer found for this workspace" }), { status: 404 }),
    );

    await expect(apiSend("/api/billing/portal", "POST", { workspaceId: "ws_1" })).rejects.toBeInstanceOf(ApiError);
  });

  it("a failed /api/billing/status fetch rejects instead of resolving with null", async () => {
    (global.fetch as any).mockResolvedValue(
      new Response(JSON.stringify({ success: false, error: "Internal error", code: "INTERNAL_ERROR" }), { status: 500 }),
    );

    // This is the exact rejection BillingManager's useEffect .catch() relies on
    // to leave LOADING and render the ERROR state instead of spinning forever.
    await expect(apiFetch("/api/billing/status")).rejects.toBeInstanceOf(ApiError);
  });
});
