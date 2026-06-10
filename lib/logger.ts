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

function emit(level: Level, message: string, context?: LogContext) {
  if (level === "debug" && process.env.NODE_ENV === "production") return;

  const entry: Record<string, unknown> = {
    level,
    ts: new Date().toISOString(),
    msg: message,
  };
  if (context) {
    for (const [key, value] of Object.entries(context)) {
      entry[key] = serializeError(value);
    }
  }

  try {
    console[LEVEL_METHOD[level]](JSON.stringify(entry));
  } catch {
    // Contexto no serializable (referencias circulares) — no perder el mensaje.
    console[LEVEL_METHOD[level]](`[${level}] ${message}`);
  }
}

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  child(base: LogContext): Logger;
}

function createLogger(base: LogContext = {}): Logger {
  const withBase = (context?: LogContext) =>
    Object.keys(base).length > 0 ? { ...base, ...context } : context;
  return {
    debug: (message, context) => emit("debug", message, withBase(context)),
    info: (message, context) => emit("info", message, withBase(context)),
    warn: (message, context) => emit("warn", message, withBase(context)),
    error: (message, context) => emit("error", message, withBase(context)),
    child: (extra) => createLogger({ ...base, ...extra }),
  };
}

export const logger = createLogger();
