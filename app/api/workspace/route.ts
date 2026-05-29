import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";
import prisma from "@/lib/prisma";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 50);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: session.user.id },
    include: {
      workspace: {
        include: {
          _count: { select: { members: true, projects: true } },
        },
      },
    },
    orderBy: { workspace: { createdAt: "asc" } },
  });

  const workspaces = memberships.map((m) => ({
    ...m.workspace,
    role: m.role,
    memberCount: m.workspace._count.members,
    projectCount: m.workspace._count.projects,
  }));

  return NextResponse.json({ data: workspaces });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name } = body;

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json(
      { error: "El nombre del workspace debe tener al menos 2 caracteres" },
      { status: 400 }
    );
  }

  const baseSlug = generateSlug(name);
  let slug = baseSlug;
  let attempts = 0;

  while (attempts < 10) {
    const existing = await prisma.workspace.findUnique({ where: { slug } });
    if (!existing) break;
    attempts++;
    slug = `${baseSlug}-${attempts}`;
  }

  const workspace = await prisma.workspace.create({
    data: {
      name: name.trim(),
      slug,
      members: {
        create: {
          userId: session.user.id,
          role: "OWNER",
        },
      },
    },
    include: {
      members: true,
    },
  });

  return NextResponse.json({ data: workspace }, { status: 201 });
}
