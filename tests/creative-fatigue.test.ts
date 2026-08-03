import { describe, it, expect } from "vitest";
import { analyzeFatigue, quickFatigueCheck, getFatigueDisplay } from "@/lib/creative-fatigue";

describe("Creative Fatigue", () => {
  describe("analyzeFatigue", () => {
    it("should return fresh for good metrics", () => {
      const res = analyzeFatigue(
        { ctr: 2.0, cpm: 10, spend: 100 },
        { ctr: 2.1, cpm: 9.5 },
        1.2,
        5
      );
      expect(res.level).toBe("fresh");
      expect(res.score).toBeLessThan(15);
    });

    it("should return critical for high frequency and high CTR drop", () => {
      const res = analyzeFatigue(
        { ctr: 0.8, cpm: 15, spend: 100 },
        { ctr: 2.0, cpm: 10 },
        6.5,
        45
      );
      // CTR drop: (2.0 - 0.8) / 2.0 = 60% -> 35 points
      // CPM increase: (15 - 10) / 10 = 50% -> 15 points
      // Freq 6.5 -> 25 points
      // Days 45 -> 15 points
      // Total >= 60 -> critical
      expect(res.level).toBe("critical");
      expect(res.score).toBeGreaterThanOrEqual(60);
      expect(res.details.ctrDrop).toBe(60);
    });

    it("should return warning for moderate fatigue", () => {
      const res = analyzeFatigue(
        { ctr: 1.5, cpm: 12, spend: 100 },
        { ctr: 2.0, cpm: 10 },
        4.5, // 18 pts
        25   // 5 pts
      );
      // CTR drop: 25% -> 20 pts
      // CPM inc: 20% -> 8 pts
      // Total = 18 + 5 + 20 + 8 = 51 -> warning (35 <= score < 60)
      expect(res.level).toBe("warning");
    });
  });

  describe("quickFatigueCheck", () => {
    it("returns critical if freq >= 5 and ctr < 0.8", () => {
      expect(quickFatigueCheck({ frequency: "5.5", ctr: "0.7" })).toBe("critical");
    });

    it("returns warning if freq >= 4 and ctr < 1.0", () => {
      expect(quickFatigueCheck({ frequency: "4.2", ctr: "0.9" })).toBe("warning");
    });

    it("returns fresh if freq < 1.5", () => {
      expect(quickFatigueCheck({ frequency: "1.2", ctr: "0.5" })).toBe("fresh");
    });

    it("returns healthy for middle values", () => {
      expect(quickFatigueCheck({ frequency: "1.8", ctr: "1.5" })).toBe("healthy");
    });
  });

  describe("getFatigueDisplay", () => {
    it("returns correct colors", () => {
      expect(getFatigueDisplay("fresh")?.label).toBe("Fresh");
      expect(getFatigueDisplay("healthy")?.label).toBe("Estable");
      expect(getFatigueDisplay("warning")?.label).toBe("Fatigando");
      expect(getFatigueDisplay("critical")?.label).toBe("Fatigado");
    });
  });
});
