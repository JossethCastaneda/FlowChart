import { NextResponse } from "next/server";
import { getMetaAccessToken, metaGetAll , META_API_VERSION } from "@/lib/server-auth";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedModule = searchParams.get("module");

    // Estricto: si se pide un módulo, SOLO su cuenta vinculada (las páginas
    // listadas deben ser las de la cuenta conectada en ese botón, no las de
    // otro módulo). Sin módulo, se usa el genérico de workspace.
    const accessToken = requestedModule
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
      ? await getMetaAccessToken(request as any, requestedModule)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
      : await getMetaAccessToken(request as any);

    if (!accessToken) {
      return NextResponse.json({ data: [], source: "no_session" });
    }

    // FIX: use env var, not hardcoded version
    const version = META_API_VERSION;
    const url = `https://graph.facebook.com/${version}/me/accounts?fields=id,name,fan_count,picture{url},instagram_business_account{id,username,profile_picture_url,followers_count}&limit=100`;
    const { data: allData, error } = await metaGetAll(url, accessToken);

    if (error && allData.length === 0) {
      return NextResponse.json({
        data: [],
        source: "api_error",
        error,
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
    const pages = allData.map((page: any) => ({
      id: page.id,
      name: page.name,
      portfolio: "Páginas y Perfiles",
      // FIX: safe optional chaining — picture.data.url can be absent
      picture:
        page.picture?.data?.url ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(page.name)}&background=random`,
      followers: page.fan_count || 0,
      instagram: page.instagram_business_account
        ? {
            id: page.instagram_business_account.id,
            username: page.instagram_business_account.username,
            picture:
              page.instagram_business_account.profile_picture_url ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                page.instagram_business_account.username ?? ""
              )}&background=random`,
            followers: page.instagram_business_account.followers_count || 0,
          }
        : null,
    }));

    return NextResponse.json({ data: pages, source: "meta_api" });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: [Arquitectura] Refactor de tipos Meta Graph API
  } catch (error: any) {
    logger.error("Error in Meta pages API:", error);
    return NextResponse.json({
      data: [],
      source: "catch_error",
      error: error?.message || "Internal server error",
    });
  }
}
