import prisma from "@/lib/prisma";
import { z } from "zod";
import { withAuth } from "@/lib/api-handler";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { validateBody } from "@/lib/validate";
import { resolveProjectCrmAssociation } from "@/lib/projects/crm";
import {
  apiSuccess,
  apiUnauthorized,
  apiForbidden,
  apiError,
  apiServerError,
} from "@/lib/api-response";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// GET /api/projects — list all projects the user has access to
// ---------------------------------------------------------------------------
export const GET = withAuth(async (req, ctx) => {
  const targetWorkspaceId = req.nextUrl.searchParams.get("workspaceId") || await getActiveWorkspaceId(ctx.userId);

  if (!targetWorkspaceId) {
    return apiSuccess([]);
  }

  // Verificar que el usuario pertenece al workspace solicitado
  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId: targetWorkspaceId, userId: ctx.userId },
    },
  });

  if (!membership) {
    return apiSuccess([]);
  }

  const projects = await prisma.project.findMany({
    where: { workspaceId: targetWorkspaceId },
    include: { channels: true },
    orderBy: { createdAt: "desc" },
  });

  return apiSuccess(projects);
});

// ---------------------------------------------------------------------------
// POST /api/projects — create a new project
// ---------------------------------------------------------------------------
const ChannelSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  config: z.record(z.string(), z.unknown()).nullish(),
});

const CreateProjectSchema = z.object({
  name: z.string().min(1, "El campo 'name' es obligatorio"),
  workspaceId: z.string().optional(),
  alias: z.string().nullish(),
  client: z.string().nullish(),
  vertical: z.string().nullish(),
  // En el modelo Prisma estos tres son String[] (múltiples cuentas por proyecto)
  fanpage: z.array(z.string()).optional(),
  instagram: z.array(z.string()).optional(),
  whatsapp: z.array(z.string()).optional(),
  webchat: z.array(z.string()).optional(),
  website: z.string().nullish(),
  persona: z.string().nullish(),
  geo: z.string().nullish(),
  status: z.string().optional(),
  // dateStart/dateEnd se almacenan como String en el modelo
  dateStart: z.string().nullish(),
  dateEnd: z.string().nullish(),
  crmIntegrationId: z.string().nullish(),
  // Invariante de producto: un proyecto envía a UNA sola plataforma analítica
  // (Botmaker o Cari, nunca ambas).
  crmIntegrationIds: z.array(z.string()).max(1, "Un proyecto envía a una sola plataforma analítica").optional(),
  crmType: z.string().nullish(),
  // Tipo de flujo del bot (metodología BAIT) para el Funnel 2 por bot.
  botFlowType: z.string().nullish(),
  channels: z.array(ChannelSchema).optional(),
});

export const POST = withAuth(async (req, ctx) => {
  const result = await validateBody(req, CreateProjectSchema);
  if (!result.ok) return result.response;
  const { name, channels, ...fields } = result.data;

  // Infer workspaceId from active workspace if not provided
  const workspaceId =
    fields.workspaceId ?? (await getActiveWorkspaceId(ctx.userId));
  if (!workspaceId) {
    return apiError("No tienes un workspace activo", "VALIDATION_ERROR", 400);
  }

  // Verify the user is a member of the target workspace
  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId, userId: ctx.userId },
    },
  });
  if (!membership) {
    return apiForbidden("No tienes acceso a este workspace");
  }

  const {
    alias, client, vertical, fanpage, instagram, whatsapp, webchat, website,
    persona, geo, status, dateStart, dateEnd, crmIntegrationId, crmIntegrationIds, crmType, botFlowType,
  } = fields;

  // Defensa tenant en escritura: solo se asocian integraciones de ESTE workspace
  // (ids ajenos/inexistentes se descartan). Mantiene legacy crmIntegrationId.
  const crmRequested = crmIntegrationId !== undefined || crmIntegrationIds !== undefined;
  const crm = crmRequested
    ? await resolveProjectCrmAssociation(workspaceId, { crmIntegrationId, crmIntegrationIds })
    : null;

  // FIX: use $transaction — project + channels must succeed or fail together
  const projectWithChannels = await prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        name,
        workspaceId,
        ...(alias !== undefined && { alias }),
        ...(client !== undefined && { client }),
        ...(vertical !== undefined && { vertical }),
        ...(fanpage !== undefined && { fanpage }),
        ...(instagram !== undefined && { instagram }),
        ...(whatsapp !== undefined && { whatsapp }),
        ...(webchat !== undefined && { webchat }),
        ...(website !== undefined && { website }),
        ...(persona !== undefined && { persona }),
        ...(geo !== undefined && { geo }),
        ...(status !== undefined && { status }),
        ...(dateStart !== undefined && { dateStart }),
        ...(dateEnd !== undefined && { dateEnd }),
        ...(crm ? { crmIntegrationIds: crm.crmIntegrationIds, crmIntegrationId: crm.crmIntegrationId } : {}),
        // crmType solo se conserva si la integración asociada es válida del workspace.
        ...(crmType !== undefined && { crmType: crm && crm.crmIntegrationId ? crmType : null }),
        ...(botFlowType !== undefined && { botFlowType }),
      },
    });

    if (channels && channels.length > 0) {
      await tx.channel.createMany({
        data: channels.map((c) => ({
          name: c.name,
          type: c.type,
          config: (c.config ?? undefined) as object | undefined,
          projectId: project.id,
        })),
      });
    }

    return tx.project.findUnique({
      where: { id: project.id },
      include: { channels: true },
    });
  });

  return apiSuccess(projectWithChannels, 201);
});
