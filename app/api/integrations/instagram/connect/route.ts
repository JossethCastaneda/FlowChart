import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { createInstagramState } from "@/lib/integrations/instagram/state";
import { safeGetSession } from "@/lib/api-handler";
import { getActiveWorkspaceId } from "@/lib/active-workspace";

export async function GET(request: NextRequest) {
  try {
    const session = await safeGetSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = await getActiveWorkspaceId(session.user.id);
    if (!workspaceId) {
      return NextResponse.json({ error: "No active workspace" }, { status: 403 });
    }

    const appId = env.INSTAGRAM_APP_ID;
    const redirectUri = env.INSTAGRAM_REDIRECT_URI;
    const scopes = env.INSTAGRAM_SCOPES;

    if (!appId || !redirectUri) {
      return NextResponse.json(
        { error: "Instagram Direct Login is not configured (missing env vars)" },
        { status: 500 }
      );
    }

    const state = createInstagramState(workspaceId, session.user.id);

    const authUrl = new URL("https://www.instagram.com/oauth/authorize");
    authUrl.searchParams.set("enable_fb_login", "0");
    authUrl.searchParams.set("force_authentication", "1");
    authUrl.searchParams.set("client_id", appId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", scopes);
    authUrl.searchParams.set("state", state);

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error("[INSTAGRAM CONNECT]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
