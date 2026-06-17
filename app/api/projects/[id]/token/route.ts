import { z } from "zod";
import prisma from "@/lib/prisma";
import { withAuth } from "@/lib/api-handler";
import { validateBody } from "@/lib/validate";
import { apiSuccess, apiNotFound, apiForbidden } from "@/lib/api-response";
import { verifyWorkspaceAccess } from "@/lib/auth-workspace";

const TokenActionSchema = z.object({
  action: z.enum(["generate", "revoke"]),
});

export const POST = withAuth(async (req, ctx) => {
  const { id } = await ctx.params;
  
  const project = await prisma.project.findUnique({
    where: { id },
  });

  if (!project) return apiNotFound("Proyecto no encontrado");

  // Opcional: Solo OWNER o ADMIN, pero como los settings de workspace
  // usualmente están restringidos, esto está bien.
  const authorized = await verifyWorkspaceAccess(project.workspaceId, ctx.userId, ["OWNER", "ADMIN"]);
  if (!authorized) return apiForbidden("Solo OWNER o ADMIN pueden modificar accesos públicos");

  const result = await validateBody(req, TokenActionSchema);
  if (!result.ok) return result.response;

  const { action } = result.data;
  let newDbToken = null;

  if (action === "generate") {
    // Generate an unguessable UUID for the token
    newDbToken = crypto.randomUUID(); 
  }

  const updated = await prisma.project.update({
    where: { id },
    data: { publicToken: newDbToken }
  });

  return apiSuccess({ publicToken: updated.publicToken });
});
