/**
 * Normalización de errores upstream de los proveedores LLM.
 * Loguea el detalle vía logger pero NUNCA lo expone al cliente (CLAUDE.md).
 */

import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { LLMProviderError } from "./types";

export enum ErrorCode {
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  UNAUTHORIZED = "UNAUTHORIZED",
  UPSTREAM_ERROR = "UPSTREAM_ERROR",
  TIMEOUT = "TIMEOUT",
  ENTITLEMENT_DENIED = "ENTITLEMENT_DENIED",
  AI_BUDGET_EXCEEDED = "AI_BUDGET_EXCEEDED",
  AI_RESERVATION_CONFLICT = "AI_RESERVATION_CONFLICT",
  AI_PRICING_UNAVAILABLE = "AI_PRICING_UNAVAILABLE"
}

export class AiError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public feature?: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = "AiError";
  }
}

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
