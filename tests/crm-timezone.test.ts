import { describe, it, expect } from "vitest";
import { cdmxRange, cdmxDay, cdmxHour, parseWallClock, wallClock } from "../lib/crm/timezone";

// CDMX es UTC-6 fijo (sin DST desde 2022).

describe("crm timezone (CDMX)", () => {
  it("convierte un instante UTC a día/hora CDMX", () => {
    // 2026-06-12 03:30 UTC = 2026-06-11 21:30 CDMX (cruza medianoche)
    const instant = Date.parse("2026-06-12T03:30:00Z");
    expect(cdmxDay(instant)).toBe("2026-06-11");
    expect(cdmxHour(instant)).toBe(21);
  });

  it("wallClock produce el formato YYYY-MM-DD HH:MM:SS que consume Cari", () => {
    const w = wallClock(Date.parse("2026-06-12T03:30:45Z"));
    expect(w.dateTime).toBe("2026-06-11 21:30:45");
  });

  it("cdmxRange ancla el inicio a las 00:00 CDMX y enumera los días", () => {
    const now = new Date("2026-06-12T03:30:00Z"); // = 2026-06-11 21:30 CDMX
    const r = cdmxRange(7, now);
    // Hoy CDMX es 06-11 → 7 días = 06-05 … 06-11
    expect(r.days).toHaveLength(7);
    expect(r.days[0]).toBe("2026-06-05");
    expect(r.days[6]).toBe("2026-06-11");
    expect(r.fromLocal).toBe("2026-06-05 00:00:00");
    expect(r.toLocal).toBe("2026-06-11 21:30:00");
    // El instante UTC del inicio corresponde a 00:00 CDMX = 06:00 UTC
    expect(r.fromISO).toBe("2026-06-05T06:00:00.000Z");
  });

  it("cdmxRange limita la ventana a 1–180 días (límite de 6 meses de Cari)", () => {
    const now = new Date("2026-06-12T12:00:00Z");
    expect(cdmxRange(0, now).days).toHaveLength(1);
    expect(cdmxRange(9999, now).days).toHaveLength(180);
  });

  it("parseWallClock lee timestamps de pared con y sin hora", () => {
    expect(parseWallClock("2026-06-10 15:42:01")).toEqual({ day: "2026-06-10", hour: 15 });
    expect(parseWallClock("2026-06-10")).toEqual({ day: "2026-06-10", hour: 0 });
    expect(parseWallClock("")).toBeNull();
    expect(parseWallClock("no-fecha")).toBeNull();
  });
});
