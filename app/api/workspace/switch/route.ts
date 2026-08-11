import { withAuth } from "@/lib/api-handler";
import { validateBody } from "@/lib/validate";
import { apiForbidden } from "@/lib/api-response";
import { ACTIVE_WORKSPACE_COOKIE } from "@/lib/active-workspace";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const SwitchSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID requerido"),
});

// POST /api/workspace/switch — switch the active workspace (sets httpOnly cookie)
export const POST = withAuth(async (req, ctx) => {
  const result = await validateBody(req, SwitchSchema);
  if (!result.ok) return result.response;
  const { workspaceId } = result.data;

  // Verify membership before switching
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: ctx.userId } },
    include: {
      workspace: { select: { id: true, name: true, slug: true } },
    },
  });

  if (!membership) {
    return apiForbidden("No tienes acceso a este workspace");
  }

  // Build success response first, then attach cookie
  const response = NextResponse.json({
    success: true,
    data: { workspace: membership.workspace },
  });

  // Cookie host-only (sin domain explícito), igual que la cookie de invitación. El
  // `.flowchart.lat` hardcodeado rompía el switch en deploys de Preview (*.vercel.app)
  // y "shadowaba" la cookie host-only puesta por otras rutas.
  response.cookies.set(ACTIVE_WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: "/",
  });

  logger.info("Active workspace switched", { workspaceId, userId: ctx.userId });

  return response;
});
