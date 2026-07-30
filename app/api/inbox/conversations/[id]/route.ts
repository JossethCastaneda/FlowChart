import { NextRequest, NextResponse } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import prisma from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  assignedTo: z.string().nullable().optional(),
  status: z.enum(["open", "closed", "assigned"]).optional(),
  unread: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

export const PATCH = withWorkspace(async (
  request,
  ctx
) => {
  try {
    const { id } = await ctx.params;
    const workspaceId = ctx.workspaceId;

    const body = await request.json();
    const data = updateSchema.parse(body);

    const conversation = await prisma.inboxConversation.findUnique({
      where: { id },
      select: { workspaceId: true },
    });

    if (!conversation || conversation.workspaceId !== workspaceId) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    const updated = await prisma.inboxConversation.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, conversation: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
});
