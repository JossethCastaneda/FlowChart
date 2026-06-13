import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth.config";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { apiUnauthorized, apiError, apiServerError } from "@/lib/api-response";
import { logger } from "@/lib/logger";

/**
 * Wrappers para route handlers de la API.
 *
 * Centralizan lo que hoy se repite a mano en cada ruta:
 *   - resolución de sesión (401 si no hay)
 *   - resolución del workspace activo con verificación de membresía
 *   - try/catch con log estructurado y error genérico al cliente
 *
 * Uso:
 *   export const GET = withWorkspace(async (req, ctx) => {
 *     const rows = await prisma.task.findMany({ where: { workspaceId: ctx.workspaceId } });
 *     return apiSuccess(rows);
 *   });
 *
 * El segundo parámetro de Next (params) se pasa tal cual en ctx.params.
 */

export interface RouteContext {
  params: Promise<Record<string, string>>;
}

export interface AuthContext {
  userId: string;
  params: RouteContext["params"];
}

export interface WorkspaceContext extends AuthContext {
  workspaceId: string;
}

type Handler<C> = (req: NextRequest, ctx: C) => Promise<Response>;

/** Requiere sesión. Inyecta userId. */
export function withAuth(handler: Handler<AuthContext>) {
  return async (req: NextRequest, routeCtx?: RouteContext): Promise<Response> => {
    try {
      let session;
      try {
        session = await getServerSession(authOptions);
      } catch (sessionError) {
        // getServerSession can throw if NEXTAUTH_SECRET is wrong, JWT is malformed,
        // or cookie cannot be verified. Treat as unauthenticated (not server error).
        logger.warn("getServerSession error — treating as unauthenticated", {
          url: req.nextUrl?.pathname,
          error: sessionError instanceof Error ? sessionError.message : String(sessionError),
        });
        return apiUnauthorized("Sesión inválida. Por favor vuelve a iniciar sesión.");
      }
      if (!session?.user?.id) return apiUnauthorized();
      return await handler(req, {
        userId: session.user.id,
        params: routeCtx?.params ?? Promise.resolve({}),
      });
    } catch (error) {
      logger.error("Unhandled API error", { url: req.nextUrl?.pathname, error });
      return apiServerError(error);
    }
  };
}


/** Requiere sesión + workspace activo (membresía verificada en getActiveWorkspaceId). */
export function withWorkspace(handler: Handler<WorkspaceContext>) {
  return withAuth(async (req, ctx) => {
    const workspaceId = await getActiveWorkspaceId(ctx.userId);
    if (!workspaceId) {
      return apiError("No tienes un workspace activo", "NO_WORKSPACE", 400);
    }
    return handler(req, { ...ctx, workspaceId });
  });
}

/**
 * Safe wrapper around getServerSession that returns null instead of throwing.
 * Use this in routes that call getServerSession directly (not through withAuth).
 * 
 * Example:
 *   const session = await safeGetSession();
 *   if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 */
export async function safeGetSession() {
  try {
    return await getServerSession(authOptions);
  } catch {
    return null;
  }
}
