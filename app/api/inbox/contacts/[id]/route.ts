import { NextRequest } from "next/server";
import { z } from "zod";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiError, apiNotFound } from "@/lib/api-response";
import { validateBody } from "@/lib/validate";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/inbox/contacts/[id] — perfil unificado: datos del contacto, sus identidades
 * por canal, sus conversaciones y un timeline de mensajes fusionado entre canales.
 */
export const GET = withWorkspace(async (_req: NextRequest, ctx) => {
  const { id } = await ctx.params;

  const contact = await prisma.contact.findFirst({
    where: { id, workspaceId: ctx.workspaceId },
    include: {
      channels: true,
      conversations: {
        orderBy: { lastMessageAt: "desc" },
        select: { id: true, platform: true, status: true, lastMessage: true, lastMessageAt: true, unread: true },
      },
    },
  });
  if (!contact) return apiNotFound("Contacto no encontrado");

  // Timeline unificado: últimos mensajes de todas las conversaciones del contacto.
  const conversationIds = contact.conversations.map((c) => c.id);
  const timeline = conversationIds.length
    ? await prisma.inboxMessage.findMany({
        where: { conversationId: { in: conversationIds } },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: { id: true, conversationId: true, content: true, sender: true, createdAt: true },
      })
    : [];

  const platformByConv = new Map(contact.conversations.map((c) => [c.id, c.platform]));

  return apiSuccess({
    contact: {
      id: contact.id,
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      avatar: contact.avatar,
      company: contact.company,
      lifecycleStage: contact.lifecycleStage,
      ownerId: contact.ownerId,
      tags: contact.tags,
      customFields: contact.customFields,
      notes: contact.notes,
      lastContactedAt: contact.lastContactedAt,
      createdAt: contact.createdAt,
      channels: contact.channels.map((ch) => ({ platform: ch.platform, externalId: ch.externalId, handle: ch.handle })),
      conversations: contact.conversations,
    },
    timeline: timeline.map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      platform: platformByConv.get(m.conversationId) ?? null,
      content: m.content,
      sender: m.sender,
      createdAt: m.createdAt,
    })),
  });
});

const UpdateContactSchema = z.object({
  name: z.string().trim().max(200).nullable().optional(),
  email: z.string().email().max(255).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  company: z.string().trim().max(200).nullable().optional(),
  lifecycleStage: z.enum(["lead", "prospect", "customer", "evangelist", "other"]).optional(),
  ownerId: z.string().nullable().optional(),
  tags: z.array(z.string().max(40)).max(30).optional(),
  notes: z.string().max(5000).nullable().optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
});

export const PATCH = withWorkspace(async (req: NextRequest, ctx) => {
  const { id } = await ctx.params;

  const existing = await prisma.contact.findFirst({
    where: { id, workspaceId: ctx.workspaceId },
    select: { id: true },
  });
  if (!existing) return apiNotFound("Contacto no encontrado");

  const parsed = await validateBody(req, UpdateContactSchema);
  if (!parsed.ok) return parsed.response;
  const d = parsed.data;

  // Si ownerId viene, verificar que sea miembro del workspace.
  if (d.ownerId) {
    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: ctx.workspaceId, userId: d.ownerId } },
      select: { id: true },
    });
    if (!member) return apiError("El propietario indicado no es miembro del workspace", "INVALID_OWNER", 400);
  }

  const data: Prisma.ContactUpdateInput = {};
  if (d.name !== undefined) data.name = d.name;
  if (d.email !== undefined) data.email = d.email;
  if (d.phone !== undefined) data.phone = d.phone;
  if (d.company !== undefined) data.company = d.company;
  if (d.lifecycleStage !== undefined) data.lifecycleStage = d.lifecycleStage;
  if (d.ownerId !== undefined) data.ownerId = d.ownerId;
  if (d.tags !== undefined) data.tags = d.tags;
  if (d.notes !== undefined) data.notes = d.notes;
  if (d.customFields !== undefined) data.customFields = d.customFields as Prisma.InputJsonValue;

  const contact = await prisma.contact.update({ where: { id }, data });
  return apiSuccess({ contact });
});
