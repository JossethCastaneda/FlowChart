/**
 * Logger estructurado mínimo para Vercel/serverless.
 *
 * Emite una línea JSON por evento con nivel, timestamp y contexto
 * (workspaceId, userId, route, etc.), de forma que los logs de producción
 * sean filtrables en lugar de console.log sueltos.
 *
 * Uso:
 *   import { logger } from "@/lib/logger";
 *   logger.info("post publicado", { workspaceId, postId });
 *   const log = logger.child({ route: "api/publisher/publish" });
 *   log.error("fallo al publicar", { error: err });
 *
 * El segundo argumento acepta:
 *   - un objeto Record<string, unknown>  → spread directo al log entry
 *   - un Error                           → { error: { name, message, stack } }
 *   - cualquier otro valor primitivo     → { value: <value> }
 *   - undefined / null                   → sin contexto extra
 */

type Level = "debug" | "info" | "warn" | "error";

export type LogContext = Record<string, unknown>;

const LEVEL_METHOD: Record<Level, "log" | "warn" | "error"> = {
  debug: "log",
  info: "log",
  warn: "warn",
  error: "error",
};

function serializeError(value: unknown): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  return value;
}

/**
 * Normalize any context argument to a LogContext object.
 * Accepts Record<string,unknown>, Error, string, array, primitive, etc.
 */
function normalizeContext(context: unknown): LogContext | undefined {
  if (context === undefined || context === null) return undefined;
  if (context instanceof Error) {
    return { error: serializeError(context) };
  }
  if (typeof context === "object" && !Array.isArray(context)) {
    return context as LogContext;
  }
  // Primitive (string, number, array, …) — wrap in { value }
  return { value: context };
}

function emit(level: Level, message: string, context?: unknown) {
  if (level === "debug" && process.env.NODE_ENV === "production") return;

  const entry: Record<string, unknown> = {
    level,
    ts: new Date().toISOString(),
    msg: message,
  };

  const normalized = normalizeContext(context);
  if (normalized) {
    for (const [key, value] of Object.entries(normalized)) {
      entry[key] = serializeError(value);
    }
  }

  try {
    console[LEVEL_METHOD[level]](JSON.stringify(entry));
  } catch {
    // Non-serializable context (circular references) — don't lose the message.
    console[LEVEL_METHOD[level]](`[${level}] ${message}`);
  }
}

export interface Logger {
  debug(message: string, context?: unknown): void;
  info(message: string, context?: unknown): void;
  warn(message: string, context?: unknown): void;
  error(message: string, context?: unknown): void;
  child(base: LogContext): Logger;
}

function createLogger(base: LogContext = {}): Logger {
  const withBase = (context?: unknown): unknown =>
    Object.keys(base).length > 0
      ? { ...base, ...(normalizeContext(context) ?? {}) }
      : context;
  return {
    debug: (message, context) => emit("debug", message, withBase(context)),
    info: (message, context) => emit("info", message, withBase(context)),
    warn: (message, context) => emit("warn", message, withBase(context)),
    error: (message, context) => emit("error", message, withBase(context)),
    child: (extra) => createLogger({ ...base, ...extra }),
  };
}

export const logger = createLogger();
