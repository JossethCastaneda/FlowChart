import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth.config";

import { apiUnauthorized, apiError, apiServerError, apiForbidden } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { ACTIVE_WORKSPACE_COOKIE } from "@/lib/active-workspace";

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
  /** Rol del usuario en el workspace activo: "OWNER" | "ADMIN" | "MEMBER" */
  role: string;
}

type Handler<C> = (req: NextRequest, ctx: C) => Promise<Response>;

/** Requiere sesión. Inyecta userId. */
export function withAuth(handler: Handler<AuthContext>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  return async (req: NextRequest, routeCtx: any): Promise<Response> => {
    try {
      let session;
      try {
        session = await getServerSession(authOptions);
      } catch (sessionError) {
        // getServerSession puede lanzar si NEXTAUTH_SECRET es incorrecto o el JWT está malformado.
        // Tratamos como no autenticado (no como error de servidor).
        logger.warn("getServerSession error — treating as unauthenticated", {
          url: req.nextUrl?.pathname,
          error: sessionError instanceof Error ? sessionError.message : String(sessionError),
        });
        return apiUnauthorized("Sesión inválida. Por favor vuelve a iniciar sesión.");
      }
      if (!session?.user?.id) return apiUnauthorized();

      // Guard against orphan sessions: verifica que el userId exista en la DB.
      // Ocurre cuando la app cambia de base de datos y el JWT sigue referenciando
      // un userId de la anterior. Se reutiliza este read para invalidar sesiones
      // tras un cambio de contraseña (passwordChangedAt vs token.loginAt).
      const userExists = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, passwordChangedAt: true },
      });
      if (!userExists) {
        logger.warn("Orphan session: userId not found in DB", {
          url: req.nextUrl?.pathname,
          userId: session.user.id,
        });
        return apiUnauthorized("Tu sesión expiró. Por favor cierra sesión y vuelve a iniciar sesión.");
      }

      // Invalidación de sesión tras cambio de contraseña: si la sesión se emitió
      // ANTES del último cambio, forzar re-login.
      const loginAt = (session as { loginAt?: number | null }).loginAt;
      if (
        userExists.passwordChangedAt &&
        typeof loginAt === "number" &&
        loginAt < userExists.passwordChangedAt.getTime()
      ) {
        return apiUnauthorized("Tu contraseña cambió. Por favor vuelve a iniciar sesión.");
      }

      return await handler(req, {
        userId: session.user.id,
        params: routeCtx?.params ?? Promise.resolve({}),
      });
    } catch (error) {
      logger.error("Unhandled API error", { url: req.nextUrl?.pathname, error });
      return apiServerError(error, req.nextUrl?.pathname);
    }
  };
}

/**
 * Requiere sesión + workspace activo (membresía verificada).
 * Inyecta workspaceId y role en el contexto.
 *
 * Orden de prioridad para resolver el workspace:
 *   1. Cookie zefirus_active_workspace (si existe y el usuario es miembro)
 *   2. Primer workspace del usuario (fallback)
 */
export function withWorkspace(handler: Handler<WorkspaceContext>) {
  return withAuth(async (req, ctx) => {
    const cookieStore = await cookies();
    const cookieWsId = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value;

    let workspaceId: string | null = null;
    let role: string = "MEMBER";

    if (cookieWsId) {
      const cookieMembership = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: cookieWsId, userId: ctx.userId } },
        select: { workspaceId: true, role: true },
      });
      if (cookieMembership) {
        workspaceId = cookieMembership.workspaceId;
        role = cookieMembership.role;
      }
    }

    if (!workspaceId) {
      const firstMembership = await prisma.workspaceMember.findFirst({
        where: { userId: ctx.userId },
        orderBy: { workspace: { createdAt: "asc" } },
        select: { workspaceId: true, role: true },
      });
      if (firstMembership) {
        workspaceId = firstMembership.workspaceId;
        role = firstMembership.role;
      }
    }

    if (!workspaceId) {
      return apiError("No tienes un workspace activo", "NO_WORKSPACE", 400);
    }

    return handler(req, { ...ctx, workspaceId, role });
  });
}

/**
 * Requiere sesión + workspace activo + rol específico.
 *
 * @param allowedRoles Roles que tienen acceso (e.g., ["OWNER", "ADMIN"])
 *
 * @example
 *   export const DELETE = withWorkspaceRole(["OWNER", "ADMIN"])(async (req, ctx) => { ... });
 */
export function withWorkspaceRole(allowedRoles: string[]) {
  return (handler: Handler<WorkspaceContext>) =>
    withWorkspace(async (req, ctx) => {
      if (!allowedRoles.includes(ctx.role)) {
        return apiForbidden(
          `Esta acción requiere uno de los siguientes roles: ${allowedRoles.join(", ")}`
        );
      }
      return handler(req, ctx);
    });
}

/**
 * Safe wrapper around getServerSession that returns null instead of throwing.
 * Use this in routes that call getServerSession directly (not through withAuth).
 *
 * @deprecated Prefer `withAuth` or `withWorkspace` wrappers when possible.
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
