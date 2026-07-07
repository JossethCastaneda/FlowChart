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

  const token = await getMetaAccessToken(request, "inbox").catch(() => null);
  if (!token) return NextResponse.json({ error: "No token" }, { status: 401 });

  try {
    let pageToken = token;
    const pagesRes = await metaFetch(
      metaUrl("me/accounts", { fields: "id,access_token", limit: "50" }),
      token
    );
    const pagesData = await pagesRes.json();
    const page = (pagesData.data || []).find((p: any) => p.id === pageId);
    if (page?.access_token) pageToken = page.access_token;

    // Fetch profile
    const profileUrl = `https://graph.facebook.com/${userId}?fields=name,profile_pic&access_token=${pageToken}`;
    const profileRes = await fetch(profileUrl);
    const profileData = await profileRes.json();

    if (profileData.name || profileData.profile_pic) {
      // Update DB so we don't have to fetch this again
      await prisma.inboxConversation.updateMany({
        where: {
          workspaceId,
          externalId: userId,
          pageId
        },
        data: {
          contactName: profileData.name || undefined,
          contactAvatar: profileData.profile_pic || undefined,
        }
      });
      
      return NextResponse.json({
        id: userId,
        name: profileData.name || null,
        picture: profileData.profile_pic || null
      });
    }

    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
