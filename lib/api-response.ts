import { NextResponse } from "next/server";

/**
 * Standardized API response helpers for Sodare.
 * Use these in all API routes for consistent error/success formatting.
 */

interface SuccessResponse<T = any> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error: string;
  code: string;
}

export function apiSuccess<T = any>(data: T, status = 200) {
  return NextResponse.json({ success: true, data } as SuccessResponse<T>, { status });
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

export function apiServerError(error: unknown) {
  const message = error instanceof Error ? error.message : "Error interno del servidor";
  return apiError(message, "INTERNAL_ERROR", 500);
}
