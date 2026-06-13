import { z } from "zod";
import prisma from "@/lib/prisma";
import { withAuth } from "@/lib/api-handler";
import { validateBody } from "@/lib/validate";
import {
  apiSuccess,
  apiNotFound,
  apiForbidden,
} from "@/lib/api-response";
import { verifyWorkspaceAccess } from "@/lib/auth-workspace";

const ChannelSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  config: z.record(z.string(), z.unknown()).nullish(),
});

const UpdateProjectSchema = z.object({
  name: z.string().optional(),
  alias: z.string().nullish(),
  client: z.string().nullish(),
  vertical: z.string().nullish(),
  fanpage: z.array(z.string()).optional(),
  instagram: z.array(z.string()).optional(),
  whatsapp: z.array(z.string()).optional(),
  website: z.string().nullish(),
  persona: z.string().nullish(),
  geo: z.string().nullish(),
  status: z.string().optional(),
  dateStart: z.string().nullish(),
  dateEnd: z.string().nullish(),
  crmIntegrationId: z.string().nullish(),
  crmIntegrationIds: z.array(z.string()).nullish(),
  crmType: z.string().nullish(),
  channels: z.array(ChannelSchema).optional(),
});

export const GET = withAuth(async (_req, ctx) => {
  const { id } = await ctx.params;
  
  const project = await prisma.project.findUnique({
    where: { id },
    include: { channels: true },
  });

  if (!project) return apiNotFound("Proyecto no encontrado");

  const authorized = await verifyWorkspaceAccess(project.workspaceId, ctx.userId);
  if (!authorized) return apiForbidden("No tienes acceso a este proyecto");

  return apiSuccess(project);
});

export const PUT = withAuth(async (req, ctx) => {
  const { id } = await ctx.params;
  
  const project = await prisma.project.findUnique({
    where: { id },
  });

  if (!project) return apiNotFound("Proyecto no encontrado");

  const authorized = await verifyWorkspaceAccess(project.workspaceId, ctx.userId);
  if (!authorized) return apiForbidden("No tienes acceso a este proyecto");

  const result = await validateBody(req, UpdateProjectSchema);
  if (!result.ok) return result.response;

  const { channels, ...updateData } = result.data;

  // Actualizar utilizando el esquema directamente
  const updatePayload = {
    ...updateData,
    ...(updateData.crmIntegrationIds !== undefined ? { crmIntegrationIds: updateData.crmIntegrationIds ?? [] } : {})
  };

  await prisma.project.update({
    where: { id },
    data: updatePayload as any,
  });

  if (channels !== undefined) {
    await prisma.$transaction(async (tx) => {
      await tx.channel.deleteMany({ where: { projectId: id } });
      if (channels.length > 0) {
        await tx.channel.createMany({
          data: channels.map((c) => ({
            name: c.name,
            type: c.type,
            config: (c.config ?? undefined) as object | undefined,
            projectId: id,
          })),
        });
      }
      // Los canales determinan qué fuentes Meta mapean a este proyecto: invalidar
      // el cache de webhooks para que se repueble con la nueva configuración.
      await tx.metaSource.deleteMany({ where: { projectId: id } });
    });
  }

  const updatedResult = await prisma.project.findUnique({
    where: { id },
    include: { channels: true },
  });

  return apiSuccess(updatedResult);
});

export const DELETE = withAuth(async (_req, ctx) => {
  const { id } = await ctx.params;
  
  const project = await prisma.project.findUnique({
    where: { id },
  });

  if (!project) return apiNotFound("Proyecto no encontrado");

  const authorized = await verifyWorkspaceAccess(project.workspaceId, ctx.userId, ["OWNER", "ADMIN"]);
  if (!authorized) return apiForbidden("Solo OWNER o ADMIN pueden eliminar proyectos");

  await prisma.project.delete({ where: { id } });

  return apiSuccess({ deleted: true });
});
