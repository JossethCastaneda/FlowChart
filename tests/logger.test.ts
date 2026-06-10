import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger } from "@/lib/logger";

let logSpy: ReturnType<typeof vi.spyOn>;
let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("logger", () => {
  it("emite JSON con nivel, timestamp y mensaje", () => {
    logger.info("hola", { workspaceId: "ws1" });
    expect(logSpy).toHaveBeenCalledTimes(1);
    const entry = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(entry.level).toBe("info");
    expect(entry.msg).toBe("hola");
    expect(entry.workspaceId).toBe("ws1");
    expect(typeof entry.ts).toBe("string");
  });

  it("serializa instancias de Error", () => {
    logger.error("falló", { error: new Error("boom") });
    const entry = JSON.parse(errorSpy.mock.calls[0][0] as string);
    expect(entry.error.message).toBe("boom");
    expect(entry.error.name).toBe("Error");
  });

  it("child() hereda el contexto base", () => {
    const child = logger.child({ route: "api/test" });
    child.info("evento", { extra: 1 });
    const entry = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(entry.route).toBe("api/test");
    expect(entry.extra).toBe(1);
  });

  it("no revienta con contexto circular", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => logger.info("circular", { circular })).not.toThrow();
    expect(logSpy).toHaveBeenCalled();
  });
});
