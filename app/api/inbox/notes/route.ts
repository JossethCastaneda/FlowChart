import { NextRequest, NextResponse } from "next/server";
import { withWorkspace } from "@/lib/api-handler";
import prisma from "@/lib/prisma";

// GET /api/inbox/notes?conversationId=xxx
export const GET = withWorkspace(async (request, ctx) => {
  const workspaceId = ctx.workspaceId;

  const conversationId = request.nextUrl.searchParams.get("conversationId");
  if (!conversationId) return NextResponse.json({ error: "Missing conversationId" }, { status: 400 });

  // Verify this conversation belongs to the workspace
  const conv = await prisma.inboxConversation.findFirst({
    where: { id: conversationId, workspaceId },
    select: { id: true },
  });
  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const notes = await prisma.inboxNote.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });

  // Enrich with author names
  const userIds = [...new Set(notes.map((n) => n.userId))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true, image: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  const enriched = notes.map((note) => {
    const author = userMap.get(note.userId);
    return {
      id: note.id,
      content: note.content,
      createdAt: note.createdAt.toISOString(),
      author: {
        id: note.userId,
        name: author?.name || author?.email?.split("@")[0] || "Agente",
        image: author?.image || null,
      },
    };
  });

  return NextResponse.json({ notes: enriched });
});

// POST /api/inbox/notes
export const POST = withWorkspace(async (request, ctx) => {
  const workspaceId = ctx.workspaceId;

  const body = await request.json();
  const { conversationId, content } = body;

  if (!conversationId || !content?.trim()) {
    return NextResponse.json({ error: "Missing conversationId or content" }, { status: 400 });
  }

  // Verify ownership
  const conv = await prisma.inboxConversation.findFirst({
    where: { id: conversationId, workspaceId },
    select: { id: true },
  });
  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const note = await prisma.inboxNote.create({
    data: {
      conversationId,
      userId: ctx.userId,
      content: content.trim(),
    },
  });

  // Get author info
  const author = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: { name: true, email: true, image: true },
  });

  return NextResponse.json({
    note: {
      id: note.id,
      content: note.content,
      createdAt: note.createdAt.toISOString(),
      author: {
        id: ctx.userId,
        name: author?.name || author?.email?.split("@")[0] || "Agente",
        image: author?.image || null,
      },
    },
  });
});

// DELETE /api/inbox/notes?noteId=xxx
export const DELETE = withWorkspace(async (request, ctx) => {
  const noteId = request.nextUrl.searchParams.get("noteId");
  if (!noteId) return NextResponse.json({ error: "Missing noteId" }, { status: 400 });

  // Only the author can delete
  const note = await prisma.inboxNote.findUnique({ where: { id: noteId } });
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (note.userId !== ctx.userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.inboxNote.delete({ where: { id: noteId } });
  return NextResponse.json({ success: true });
});
