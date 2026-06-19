import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * GET /api/inbox/dm-automation
 *
 * Lists all DmAutomationRule records for the active workspace.
 */
export async function GET(req: NextRequest) {
  try {
    const jwt = await getToken({ req });
    if (!jwt?.sub) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const workspaceId = await getActiveWorkspaceId(jwt.sub);
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace activo" }, { status: 400 });
    }

    const rules = await prisma.dmAutomationRule.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ rules });
  } catch (err: any) {
    logger.error("[DM-AUTOMATION] GET error:", err.message);
    return NextResponse.json(
      { error: err.message || "Error interno" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/inbox/dm-automation
 *
 * Creates a new DmAutomationRule.
 *
 * Body:
 *   name:      string
 *   trigger:   string   — keyword that activates the rule
 *   response:  string   — auto-reply message
 *   platforms: string[] — e.g. ["messenger", "instagram_dm"]
 *   active:    boolean  — default true
 */
export async function POST(req: NextRequest) {
  try {
    const jwt = await getToken({ req });
    if (!jwt?.sub) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const workspaceId = await getActiveWorkspaceId(jwt.sub);
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace activo" }, { status: 400 });
    }

    const body = await req.json();
    const { name, trigger, response, platforms, active = true } = body;

    if (!name || !trigger || !response) {
      return NextResponse.json(
        { error: "name, trigger y response son requeridos" },
        { status: 400 }
      );
    }

    const rule = await prisma.dmAutomationRule.create({
      data: {
        workspaceId,
        name,
        trigger,
        response,
        platforms: platforms || [],
        active,
      },
    });

    return NextResponse.json({ rule }, { status: 201 });
  } catch (err: any) {
    logger.error("[DM-AUTOMATION] POST error:", err.message);
    return NextResponse.json(
      { error: err.message || "Error interno" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/inbox/dm-automation
 *
 * Updates an existing DmAutomationRule by id.
 *
 * Body:
 *   id:        string   — Rule ID to update
 *   name?:     string
 *   trigger?:  string
 *   response?: string
 *   platforms?: string[]
 *   active?:   boolean
 */
export async function PUT(req: NextRequest) {
  try {
    const jwt = await getToken({ req });
    if (!jwt?.sub) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const workspaceId = await getActiveWorkspaceId(jwt.sub);
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace activo" }, { status: 400 });
    }

    const body = await req.json();
    const { id, name, trigger, response, platforms, active } = body;

    if (!id) {
      return NextResponse.json({ error: "id es requerido" }, { status: 400 });
    }

    // Verify rule belongs to this workspace
    const existing = await prisma.dmAutomationRule.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Regla no encontrada" }, { status: 404 });
    }

    const rule = await prisma.dmAutomationRule.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(trigger !== undefined && { trigger }),
        ...(response !== undefined && { response }),
        ...(platforms !== undefined && { platforms }),
        ...(active !== undefined && { active }),
      },
    });

    return NextResponse.json({ rule });
  } catch (err: any) {
    logger.error("[DM-AUTOMATION] PUT error:", err.message);
    return NextResponse.json(
      { error: err.message || "Error interno" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/inbox/dm-automation
 *
 * Deletes a DmAutomationRule by id.
 *
 * Body:
 *   id: string — Rule ID to delete
 */
export async function DELETE(req: NextRequest) {
  try {
    const jwt = await getToken({ req });
    if (!jwt?.sub) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const workspaceId = await getActiveWorkspaceId(jwt.sub);
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace activo" }, { status: 400 });
    }

    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "id es requerido" }, { status: 400 });
    }

    // Verify rule belongs to this workspace
    const existing = await prisma.dmAutomationRule.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Regla no encontrada" }, { status: 404 });
    }

    await prisma.dmAutomationRule.delete({ where: { id } });

    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    logger.error("[DM-AUTOMATION] DELETE error:", err.message);
    return NextResponse.json(
      { error: err.message || "Error interno" },
      { status: 500 }
    );
  }
}
