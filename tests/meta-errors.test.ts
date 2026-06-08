import { describe, it, expect } from "vitest";
import { mapMetaError, calculateDataQuality } from "../lib/meta-errors";

describe("mapMetaError", () => {
  it("maps token expiry (code 190) to refresh_token", () => {
    const r = mapMetaError({ error: { code: 190 } });
    expect(r.category).toBe("token");
    expect(r.action).toBe("refresh_token");
    expect(r.retryable).toBe(false);
    expect(r.original_code).toBe(190);
  });

  it("maps transient codes (e.g. 613 rate limit) to retry_backoff + retryable", () => {
    const r = mapMetaError({ error: { code: 613 } });
    expect(r.category).toBe("transient");
    expect(r.action).toBe("retry_backoff");
    expect(r.retryable).toBe(true);
  });

  it("maps permission codes (10) to check_scopes", () => {
    const r = mapMetaError({ error: { code: 10 } });
    expect(r.category).toBe("permission");
    expect(r.action).toBe("check_scopes");
  });

  it("maps policy codes (368) to human_intervention", () => {
    const r = mapMetaError({ error: { code: 368 } });
    expect(r.category).toBe("policy");
    expect(r.action).toBe("human_intervention");
  });

  it("maps dev-mode token subcode (2424009) to reconnect guidance", () => {
    const r = mapMetaError({ error: { code: 100, error_subcode: 2424009 } });
    expect(r.category).toBe("policy");
    expect(r.action).toBe("human_intervention");
  });

  it("accepts a bare error object (not nested under 'error')", () => {
    const r = mapMetaError({ code: 190 });
    expect(r.action).toBe("refresh_token");
  });

  it("falls back for unknown codes, surfacing the original message", () => {
    const r = mapMetaError({ error: { code: 999999, message: "weird thing" } });
    expect(r.original_code).toBe(999999);
    expect(r.user_message).toContain("weird thing");
  });
});

describe("calculateDataQuality", () => {
  it("flags incomplete learning when data is < 3 days old", () => {
    const today = new Date().toISOString().slice(0, 10);
    const q = calculateDataQuality(today, today);
    expect(q.incomplete_learning).toBe(true);
  });

  it("does not flag old data", () => {
    const q = calculateDataQuality("2020-01-01", "2020-01-10");
    expect(q.incomplete_learning).toBe(false);
    expect(q.data_age_days).toBeGreaterThan(3);
  });

  it("returns zeros when no until date is given", () => {
    expect(calculateDataQuality()).toEqual({
      data_age_days: 0,
      incomplete_learning: false,
    });
  });
});
