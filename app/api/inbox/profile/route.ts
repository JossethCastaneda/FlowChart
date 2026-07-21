import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { getMetaAccessToken, metaFetch, metaUrl, META_API_VERSION } from "@/lib/server-auth";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const jwt = await getToken({ req: request });
  if (!jwt?.sub) return new NextResponse(null, { status: 401 });

  const workspaceId = await getActiveWorkspaceId(jwt.sub);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });

  const userId = request.nextUrl.searchParams.get("userId");
  const pageId = request.nextUrl.searchParams.get("pageId");
  
  if (!userId || !pageId) return NextResponse.json({ error: "Missing params" }, { status: 400 });

  const [fbToken, igToken] = await Promise.all([
    getMetaAccessToken(request, "inbox").catch(() => null),
    getMetaAccessToken(request, "ig_inbox").catch(() => null),
  ]);
  const baseToken = fbToken || igToken;
  if (!baseToken) return NextResponse.json({ error: "No token" }, { status: 401 });

  try {
    let pageToken = baseToken;
    let foundPage = false;
    
    // Attempt with fbToken
    if (fbToken) {
      const pagesRes = await metaFetch(
        metaUrl("me/accounts", { fields: "id,access_token,instagram_business_account{id}", limit: "50" }),
        fbToken
      );
      const pagesData = await pagesRes.json();
      const page = (pagesData.data || []).find((p: any) => p.id === pageId || p.instagram_business_account?.id === pageId);
      if (page?.access_token) {
        pageToken = page.access_token;
        foundPage = true;
      }
    }
    
    // Attempt with igToken if not found
    if (!foundPage && igToken && igToken !== fbToken) {
      const pagesRes = await metaFetch(
        metaUrl("me/accounts", { fields: "id,access_token,instagram_business_account{id}", limit: "50" }),
        igToken
      );
      const pagesData = await pagesRes.json();
      const page = (pagesData.data || []).find((p: any) => p.id === pageId || p.instagram_business_account?.id === pageId);
      if (page?.access_token) {
        pageToken = page.access_token;
      }
    }

    // Fetch profile (Messenger API uses first_name/last_name, IG uses name)
    const cleanUserId = userId.replace("igc_", "").replace("fbc_", "");
    // SEGURIDAD: cleanUserId se interpola en el path de la Graph API. Los PSID / IG ids
    // son numéricos → allowlist estricta (evita path injection tipo el proxy de avatares).
    if (!/^\d+$/.test(cleanUserId)) {
      return NextResponse.json({ error: "userId inválido" }, { status: 400 });
    }

    // Determine platform from the conversation in database if possible, or fallback to igc_ prefix
    const conv = await prisma.inboxConversation.findFirst({
      where: { workspaceId, externalId: userId },
      select: { platform: true }
    });
    const isInstagram = conv?.platform?.includes("instagram") || conv?.platform?.includes("ig_") || userId.startsWith("igc_");

    // Token vía Bearer header (metaFetch), NUNCA en la URL (evita fuga en logs).
    const fields = isInstagram ? "name,username,profile_picture_url" : "name,first_name,last_name,profile_pic";
    const profileUrl = `https://graph.facebook.com/${META_API_VERSION}/${cleanUserId}?fields=${fields}`;

    const profileRes = await metaFetch(profileUrl, pageToken, { cache: "no-store" });
    const profileData = await profileRes.json();

    const fullName = profileData.name || [profileData.first_name, profileData.last_name].filter(Boolean).join(" ") || profileData.username || null;
    const picture = isInstagram ? profileData.profile_picture_url : profileData.profile_pic;

    if (fullName || picture) {
      // Update DB so we don't have to fetch this again
      await prisma.inboxConversation.updateMany({
        where: {
          workspaceId,
          externalId: userId,
          pageId
        },
        data: {
          contactName: fullName || undefined,
          contactAvatar: picture || undefined,
        }
      });
      
      return NextResponse.json({
        id: userId,
        name: fullName,
        picture: picture || null
      });
    }

    return NextResponse.json({ error: "Not found", details: profileData }, { status: 404 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("[INBOX-PROFILE] Error fetching profile", { userId: request.nextUrl.searchParams.get("userId"), error: message });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
