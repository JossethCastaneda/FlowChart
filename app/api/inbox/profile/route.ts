import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { getMetaAccessToken, metaFetch, metaUrl } from "@/lib/server-auth";
import prisma from "@/lib/prisma";

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
    const profileUrl = `https://graph.facebook.com/${cleanUserId}?fields=name,first_name,last_name,profile_pic&access_token=${pageToken}`;
    const profileRes = await fetch(profileUrl);
    const profileData = await profileRes.json();

    const fullName = profileData.name || [profileData.first_name, profileData.last_name].filter(Boolean).join(" ") || null;

    if (fullName || profileData.profile_pic) {
      // Update DB so we don't have to fetch this again
      await prisma.inboxConversation.updateMany({
        where: {
          workspaceId,
          externalId: userId,
          pageId
        },
        data: {
          contactName: fullName || undefined,
          contactAvatar: profileData.profile_pic || undefined,
        }
      });
      
      return NextResponse.json({
        id: userId,
        name: fullName,
        picture: profileData.profile_pic || null
      });
    }

    return NextResponse.json({ error: "Not found", details: profileData }, { status: 404 });
  } catch (err: any) {
    require("fs").writeFileSync("profile_debug_error.json", JSON.stringify({ error: err.message, stack: err.stack }), "utf8");
    return NextResponse.json({ error: "Server error", message: err.message }, { status: 500 });
  }
}
