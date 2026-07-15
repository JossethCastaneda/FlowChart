import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * Standardized API response helpers for Zefirus.
 * Use these in all API routes for consistent error/success formatting.
 */

interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error: string;
  code: string;
}

/** 200 OK with data */
export function apiSuccess<T = unknown>(data: T, status = 200) {
  return NextResponse.json({ success: true, data } as SuccessResponse<T>, { status });
}

/** 201 Created with data */
export function apiCreated<T = unknown>(data: T) {
  return apiSuccess(data, 201);
}

/** 204 No Content */
export function apiNoContent() {
  return new NextResponse(null, { status: 204 });
}

export function apiError(error: string, code: string, status = 400) {
  return NextResponse.json({ success: false, error, code } as ErrorResponse, { status });
}

export function apiUnauthorized(message = "No autorizado") {
  return apiError(message, "UNAUTHORIZED", 401);
}

export function apiForbidden(message = "Sin permisos") {
  return apiError(message, "FORBIDDEN", 403);
}

export function apiNotFound(message = "No encontrado") {
  return apiError(message, "NOT_FOUND", 404);
}

export function apiServerError(error: unknown, hint?: string) {
  // Always log the full error to structured logs (visible in Vercel dashboard)
  logger.error("apiServerError", {
    hint,
    error,
    errorMessage: error instanceof Error ? error.message : String(error),
    errorName: error instanceof Error ? error.name : undefined,
    stack: error instanceof Error ? error.stack?.slice(0, 500) : undefined,
  });
  // Nunca exponer detalles internos (mensajes de Prisma, stack traces, hosts)
  // al cliente en producción; el detalle queda en los logs del servidor.
  const message =
    process.env.NODE_ENV !== "production" && error instanceof Error
      ? error.message
      : "Error interno del servidor";
  return apiError(message, "INTERNAL_ERROR", 500);
}
