import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { withAuth } from "@/lib/api-handler";

// GET /api/notifications — get user's notifications
export const GET = withAuth(async (_req, ctx) => {
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: ctx.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.notification.count({
      where: { userId: ctx.userId, read: false },
    }),
  ]);

  return NextResponse.json({ data: notifications, unreadCount });
});

// PATCH /api/notifications — mark all as read
export const PATCH = withAuth(async (_req, ctx) => {
  await prisma.notification.updateMany({
    where: { userId: ctx.userId, read: false },
    data: { read: true },
  });

  return NextResponse.json({ success: true });
});
