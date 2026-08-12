/**
 * Normalización de errores upstream de los proveedores LLM.
 * Loguea el detalle vía logger pero NUNCA lo expone al cliente (CLAUDE.md).
 */

import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { LLMProviderError } from "./types";

export function normalizeUpstreamError(err: unknown): NextResponse {
  if (err instanceof Error && err.name === "TimeoutError") {
    logger.error("[Aria LLM] timeout", { message: err.message });
    return apiError("La IA tardó demasiado en responder. Intenta de nuevo.", "TIMEOUT", 504);
  }

  if (err instanceof LLMProviderError) {
    logger.error("[Aria LLM] upstream error", {
      provider: err.provider,
      status: err.status,
      message: err.message,
    });
    return apiError("Error del servicio de IA. Intenta de nuevo.", "UPSTREAM_ERROR", 502);
  }
  logger.error("[Aria LLM] error inesperado", {
    error: err instanceof Error ? err.message : String(err),
  });
  return apiError("Error del servicio de IA.", "UPSTREAM_ERROR", 502);
}
