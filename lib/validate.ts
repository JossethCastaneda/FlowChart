import type { ZodSchema } from "zod";
import { NextRequest } from "next/server";
import { apiError } from "@/lib/api-response";

type Validated<T> =
  | { ok: true; data: T }
  | { ok: false; response: ReturnType<typeof apiError> };

/**
 * Parse and validate a JSON request body against a Zod schema.
 * Returns a discriminated union: { ok, data } or { ok, response }.
 *
 * Usage:
 *   const result = await validateBody(req, MySchema);
 *   if (!result.ok) return result.response;
 *   const { field1, field2 } = result.data;
 */
export async function validateBody<T>(
  req: Request,
  schema: ZodSchema<T>
): Promise<Validated<T>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { ok: false, response: apiError("JSON inválido", "BAD_JSON", 400) };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    return { ok: false, response: apiError(msg, "VALIDATION_ERROR", 422) };
  }
  return { ok: true, data: parsed.data };
}

/**
 * Parse and validate URL searchParams against a Zod schema.
 * Returns a discriminated union: { ok, data } or { ok, response }.
 *
 * Usage:
 *   const result = validateQuery(req, QuerySchema);
 *   if (!result.ok) return result.response;
 *   const { page, limit } = result.data;
 */
export function validateQuery<T>(
  req: NextRequest,
  schema: ZodSchema<T>
): Validated<T> {
  const raw = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    return { ok: false, response: apiError(msg, "VALIDATION_ERROR", 422) };
  }
  return { ok: true, data: parsed.data };
}
