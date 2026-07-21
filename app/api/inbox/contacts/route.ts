import { NextRequest } from "next/server";
import { z } from "zod";
import { withWorkspace } from "@/lib/api-handler";
import { apiSuccess, apiCreated, apiError } from "@/lib/api-response";
import { validateBody } from "@/lib/validate";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/inbox/contacts — lista/busca contactos del CRM del workspace.
 * Query: q (busca en nombre/email/phone/company), stage, ownerId, tag, limit, cursor.
 * POST — crea un contacto manual.
 */
export const GET = withWorkspace(async (req: NextRequest, ctx) => {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const stage = searchParams.get("stage") || undefined;
  const ownerId = searchParams.get("ownerId") || undefined;
  const tag = searchParams.get("tag") || undefined;
  const limitRaw = parseInt(searchParams.get("limit") || "50", 10);
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 50;
  const cursor = searchParams.get("cursor") || undefined;

  const where: Prisma.ContactWhereInput = {
    workspaceId: ctx.workspaceId,
    ...(stage ? { lifecycleStage: stage } : {}),
    ...(ownerId ? { ownerId } : {}),
    ...(tag ? { tags: { has: tag } } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
            { company: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const contacts = await prisma.contact.findMany({
    where,
    orderBy: [{ lastContactedAt: "desc" }, { createdAt: "desc" }],
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    include: {
      channels: { select: { platform: true, externalId: true, handle: true } },
      _count: { select: { conversations: true } },
    },
  });

  const hasMore = contacts.length > limit;
  const page = hasMore ? contacts.slice(0, limit) : contacts;

  return apiSuccess({
    contacts: page.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      avatar: c.avatar,
      company: c.company,
      lifecycleStage: c.lifecycleStage,
      ownerId: c.ownerId,
      tags: c.tags,
      lastContactedAt: c.lastContactedAt,
      channels: c.channels,
      conversationCount: c._count.conversations,
    })),
    nextCursor: hasMore ? page[page.length - 1]?.id : null,
  });
});

const CreateContactSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  email: z.string().email().max(255).optional(),
  phone: z.string().trim().max(40).optional(),
  company: z.string().trim().max(200).optional(),
  lifecycleStage: z.enum(["lead", "prospect", "customer", "evangelist", "other"]).optional(),
  ownerId: z.string().optional(),
  tags: z.array(z.string().max(40)).max(30).optional(),
  notes: z.string().max(5000).optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
});

export const POST = withWorkspace(async (req: NextRequest, ctx) => {
  const parsed = await validateBody(req, CreateContactSchema);
  if (!parsed.ok) return parsed.response;
  const d = parsed.data;
  if (!d.name && !d.email && !d.phone) {
    return apiError("Se requiere al menos nombre, email o teléfono", "VALIDATION_ERROR", 400);
  }

  const contact = await prisma.contact.create({
    data: {
      workspaceId: ctx.workspaceId,
      name: d.name ?? null,
      email: d.email ?? null,
      phone: d.phone ?? null,
      company: d.company ?? null,
      lifecycleStage: d.lifecycleStage ?? "lead",
      ownerId: d.ownerId ?? null,
      tags: d.tags ?? [],
      notes: d.notes ?? null,
      customFields: (d.customFields ?? {}) as Prisma.InputJsonValue,
    },
  });

  return apiCreated({ contact });
});
