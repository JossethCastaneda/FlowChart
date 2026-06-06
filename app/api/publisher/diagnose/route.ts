import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";
import { getMetaAccessToken, metaFetch } from "@/lib/server-auth";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import prisma from "@/lib/prisma";

const META_VERSION = process.env.META_API_VERSION || "v25.0";

/**
 * GET /api/publisher/diagnose
 *
 * Runs a full diagnostic of the publisher pipeline:
 * - Session check
 * - Workspace check
 * - Integration token check
 * - Meta pages API call
 * - Instagram business account check
 *
 * Returns a structured JSON with pass/fail for each step.
 */
export async function GET(req: NextRequest) {
  const results: Record<string, { ok: boolean; detail: string }> = {};

  // 1. Session
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    results.session = { ok: false, detail: "No hay sesión activa" };
    return NextResponse.json({ results, ready: false });
  }
  results.session = { ok: true, detail: `userId: ${session.user.id}` };

  // 2. Workspace
  const workspaceId = await getActiveWorkspaceId(session.user.id);
  if (!workspaceId) {
    results.workspace = { ok: false, detail: "No hay workspace activo" };
    return NextResponse.json({ results, ready: false });
  }
  results.workspace = { ok: true, detail: `workspaceId: ${workspaceId}` };

  // 3. Integration token in DB
  const integration = await prisma.integration.findUnique({
    where: { workspaceId_provider: { workspaceId, provider: "meta" } },
  });
  if (!integration) {
    results.integration_db = { ok: false, detail: "No existe registro 'meta' en la tabla Integration" };
  } else if (!integration.connected) {
    results.integration_db = { ok: false, detail: "Integration.connected = false" };
  } else {
    const creds = integration.credentials as any;
    results.integration_db = {
      ok: !!creds?.accessToken,
      detail: creds?.accessToken
        ? `Token en DB (expira: ${creds.expiresAt || "sin fecha"})`
        : "credentials.accessToken está vacío",
    };
  }

  // 4. Access token resolution
  const accessToken = await getMetaAccessToken(req, "social");
  if (!accessToken) {
    results.access_token = { ok: false, detail: "getMetaAccessToken devolvió null — no hay token activo" };
    return NextResponse.json({ results, ready: false });
  }
  results.access_token = { ok: true, detail: "Token obtenido correctamente" };

  // 5. Meta /me endpoint
  try {
    const meRes = await metaFetch(
      `https://graph.facebook.com/${META_VERSION}/me?fields=id,name`,
      accessToken
    );
    const meData = await meRes.json();
    if (meRes.ok && meData.id) {
      results.meta_me = { ok: true, detail: `Meta user: ${meData.name} (${meData.id})` };
    } else {
      results.meta_me = {
        ok: false,
        detail: `Error: ${meData?.error?.message || "respuesta inesperada"} (code: ${meData?.error?.code})`,
      };
      return NextResponse.json({ results, ready: false });
    }
  } catch (e: any) {
    results.meta_me = { ok: false, detail: `Excepción: ${e.message}` };
    return NextResponse.json({ results, ready: false });
  }

  // 6. Meta pages
  try {
    const pagesRes = await metaFetch(
      `https://graph.facebook.com/${META_VERSION}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&limit=10`,
      accessToken
    );
    const pagesData = await pagesRes.json();
    const pages = pagesData.data || [];
    if (!pagesRes.ok || pages.length === 0) {
      results.meta_pages = {
        ok: false,
        detail: pagesData?.error?.message || "No se encontraron páginas de Facebook. Verifica permisos de la app (pages_show_list, pages_read_engagement).",
      };
    } else {
      const pagesSummary = pages.map((p: any) => {
        const ig = p.instagram_business_account;
        return `"${p.name}" (FB: ${p.id}${ig ? `, IG: @${ig.username}` : ", sin IG"})`;
      });
      results.meta_pages = {
        ok: true,
        detail: `${pages.length} página(s): ${pagesSummary.join(" | ")}`,
      };

      // Check if any page has IG account
      const hasIg = pages.some((p: any) => p.instagram_business_account);
      results.instagram_account = {
        ok: hasIg,
        detail: hasIg
          ? "Al menos una página tiene cuenta de Instagram Business vinculada"
          : "Ninguna página tiene Instagram Business Account vinculado — no podrás publicar en Instagram",
      };
    }
  } catch (e: any) {
    results.meta_pages = { ok: false, detail: `Excepción: ${e.message}` };
  }

  const allOk = Object.values(results).every((r) => r.ok);
  return NextResponse.json({ results, ready: allOk });
}
