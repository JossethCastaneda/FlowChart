import { describe, it, expect, vi, afterEach } from "vitest";
import { rateLimit, getClientIP } from "@/lib/ratelimit";

afterEach(() => {
  vi.useRealTimers();
});

describe("rateLimit", () => {
  it("permite hasta maxAttempts dentro de la ventana", async () => {
    const key = `t1-${Math.random()}`;
    expect((await rateLimit(key, 3, 60_000)).ok).toBe(true);
    expect((await rateLimit(key, 3, 60_000)).ok).toBe(true);
    expect((await rateLimit(key, 3, 60_000)).ok).toBe(true);
    expect((await rateLimit(key, 3, 60_000)).ok).toBe(false);
  });

  it("reporta remaining decreciente", async () => {
    const key = `t2-${Math.random()}`;
    expect((await rateLimit(key, 3, 60_000)).remaining).toBe(2);
    expect((await rateLimit(key, 3, 60_000)).remaining).toBe(1);
    expect((await rateLimit(key, 3, 60_000)).remaining).toBe(0);
  });

  it("resetea después de la ventana", async () => {
    vi.useFakeTimers();
    const key = `t3-${Math.random()}`;
    expect((await rateLimit(key, 1, 1_000)).ok).toBe(true);
    expect((await rateLimit(key, 1, 1_000)).ok).toBe(false);
    vi.advanceTimersByTime(1001);
    expect((await rateLimit(key, 1, 1_000)).ok).toBe(true);
  });

  it("usa claves independientes", async () => {
    const a = `t4a-${Math.random()}`;
    const b = `t4b-${Math.random()}`;
    expect((await rateLimit(a, 1, 60_000)).ok).toBe(true);
    expect((await rateLimit(a, 1, 60_000)).ok).toBe(false);
    expect((await rateLimit(b, 1, 60_000)).ok).toBe(true);
  });
});

describe("getClientIP", () => {
  it("prioriza x-vercel-forwarded-for sobre x-forwarded-for", () => {
    const req = new Request("http://x", {
      headers: {
        "x-vercel-forwarded-for": "111.111.111.111",
        "x-forwarded-for": "1.2.3.4, 5.6.7.8",
      },
    });
    expect(getClientIP(req)).toBe("111.111.111.111");
  });

  it("toma la primera IP de x-forwarded-for", () => {
    const req = new Request("http://x", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIP(req)).toBe("1.2.3.4");
  });

  it("cae a x-real-ip y luego a unknown", () => {
    const real = new Request("http://x", { headers: { "x-real-ip": "9.9.9.9" } });
    expect(getClientIP(real)).toBe("9.9.9.9");
    expect(getClientIP(new Request("http://x"))).toBe("unknown");
  });
});
