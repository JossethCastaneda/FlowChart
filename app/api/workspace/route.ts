import { withAuth, withWorkspace, withWorkspaceRole } from "@/lib/api-handler";
import { validateBody } from "@/lib/validate";
import { apiSuccess, apiCreated, apiError, apiServerError } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { generateSlug, generateUniqueSlug } from "@/lib/slug";
import prisma from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const CreateWorkspaceSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(80),
});

// GET /api/workspace — list all workspaces the authenticated user belongs to
export const GET = withAuth(async (_req, ctx) => {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: ctx.userId },
    include: {
      workspace: {
        include: {
          _count: { select: { members: true, projects: true } },
        },
      },
    },
    orderBy: { workspace: { createdAt: "asc" } },
  });

  // Determine active workspace via cookie (best-effort — no throw)
  let activeId: string | null = null;
  try {
    const { getActiveWorkspaceId } = await import("@/lib/active-workspace");
    activeId = await getActiveWorkspaceId(ctx.userId);
  } catch {
    // Cookie read may fail in edge cases — not critical
  }

  const workspaces = memberships.map((m) => ({
    id: m.workspace.id,
    name: m.workspace.name,
    slug: m.workspace.slug,
    plan: m.workspace.plan,
    role: m.role,
    memberCount: m.workspace._count.members,
    projectCount: m.workspace._count.projects,
    createdAt: m.workspace.createdAt,
    isActive: m.workspace.id === activeId,
  }));

  // Sort: active first, then by creation date
  workspaces.sort((a, b) => {
    if (a.isActive) return -1;
    if (b.isActive) return 1;
    return 0;
  });

  return apiSuccess(workspaces);
});

// POST /api/workspace — create a new workspace (authenticated user becomes OWNER)
export const POST = withAuth(async (req, ctx) => {
  const result = await validateBody(req, CreateWorkspaceSchema);
  if (!result.ok) return result.response;
  const { name } = result.data;

  const baseSlug = generateSlug(name);
  if (!baseSlug) {
    return apiError("El nombre no produce un slug válido", "VALIDATION_ERROR", 422);
  }

  const slug = await generateUniqueSlug(
    baseSlug,
    async (s) => !!(await prisma.workspace.findUnique({ where: { slug: s }, select: { id: true } }))
  );

  const workspace = await prisma.$transaction(async (tx) => {
    const ws = await tx.workspace.create({
      data: {
        name: name.trim(),
        slug,
        members: {
          create: { userId: ctx.userId, role: "OWNER" },
        },
      },
      select: { id: true, name: true, slug: true, plan: true, createdAt: true },
    });
    return ws;
  });

  logger.info("Workspace created", { workspaceId: workspace.id, userId: ctx.userId, slug });

  return apiCreated(workspace);
});
