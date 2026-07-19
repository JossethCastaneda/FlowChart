import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth.config";

import { getActiveWorkspaceId } from "@/lib/active-workspace";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
export const dynamic = "force-dynamic";

/**
 * GET /api/health
 * 
 * Diagnostic endpoint that tests the full auth → workspace → DB pipeline.
 * Returns timing information for each step to help diagnose production issues.
 * 
 * Does NOT expose sensitive data — only timing, status codes, and step names.
 */
export async function GET(req: NextRequest) {
  const steps: { step: string; ms: number; status: string; detail?: string }[] = [];
  const t0 = Date.now();

  // Step 1: Session
  let session: any = null;
  try {
    const t1 = Date.now();
    session = await getServerSession(authOptions);
    steps.push({ step: "getServerSession", ms: Date.now() - t1, status: session?.user?.id ? "ok" : "no_session" });
  } catch (err) {
    steps.push({ step: "getServerSession", ms: Date.now() - t0, status: "error", detail: err instanceof Error ? err.message : "unknown" });
    logger.error("[health] getServerSession failed", { error: err });
    return NextResponse.json({ ok: false, steps, totalMs: Date.now() - t0 });
  }

  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, steps, totalMs: Date.now() - t0, hint: "Not authenticated — no session cookie" });
  }

  // Step 2: Active workspace
  let workspaceId: string | null = null;
  try {
    const t2 = Date.now();
    workspaceId = await getActiveWorkspaceId(session.user.id);
    steps.push({ step: "getActiveWorkspaceId", ms: Date.now() - t2, status: workspaceId ? "ok" : "no_workspace" });
  } catch (err) {
    steps.push({ step: "getActiveWorkspaceId", ms: Date.now() - t0, status: "error", detail: err instanceof Error ? err.message : "unknown" });
    logger.error("[health] getActiveWorkspaceId failed", { error: err });
    return NextResponse.json({ ok: false, steps, totalMs: Date.now() - t0 });
  }

  // Step 3: DB query
  if (workspaceId) {
    try {
      const t3 = Date.now();
      const count = await prisma.project.count({ where: { workspaceId } });
      steps.push({ step: "prisma.project.count", ms: Date.now() - t3, status: "ok", detail: `${count} projects` });
    } catch (err) {
      steps.push({ step: "prisma.project.count", ms: Date.now() - t0, status: "error", detail: err instanceof Error ? err.message : "unknown" });
      logger.error("[health] prisma query failed", { error: err });
      return NextResponse.json({ ok: false, steps, totalMs: Date.now() - t0 });
    }
  }

  return NextResponse.json({
    ok: true,
    steps,
    totalMs: Date.now() - t0,
    env: {
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV || "not-vercel",
      dbHost: (() => {
        try {
          const url = process.env.DATABASE_URL || process.env.STORAGE_DATABASE_URL || "";
          return new URL(url).host;
        } catch { return "unknown"; }
      })(),
    },
  });
}
