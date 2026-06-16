import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { decryptToken } from "@/lib/encryption";
import { verifyQstashRequest } from "@/lib/qstash";
import { publishSinglePost } from "@/lib/publisher/publish-single-post";

// El polling de video de IG puede tardar hasta ~50s; dejamos margen sobre 60s.
export const maxDuration = 120;

// Una entrega QStash atascada (crash/timeout sin liberar el lock) se reclama
// pasados estos ms, para que un reintento pueda retomarla.
const STALE_LOCK_MS = 5 * 60 * 1000;

/**
 * POST /api/jobs/publish
 *
 * Invocado por QStash para publicar un post programado concreto por su id.
 * Body: { publishJobId: string }
 *
 * Autenticación: firma `Upstash-Signature` (preferida) o, como fallback, el
 * bearer `PUBLISH_WORKER_SECRET` que QStash reenvía. Ver lib/qstash.ts.
 */
export async function POST(req: NextRequest) {
  // El body crudo se necesita tanto para verificar la firma como para parsearlo.
  const rawBody = await req.text();

  const auth = await verifyQstashRequest(req, rawBody);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized worker" }, { status: 401 });
  }

  try {
    const body = rawBody ? JSON.parse(rawBody) : {};
    const { publishJobId } = body;
    if (!publishJobId) {
      return NextResponse.json({ error: "publishJobId is required" }, { status: 400 });
    }

    const result = await publishSinglePost(publishJobId);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[WORKER POST] Error:", err);
    return NextResponse.json({ error: err?.message || "Error" }, { status: 500 });
  }
}

