import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "@/lib/prisma";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { refreshAccessToken, GoogleCredentials } from "@/lib/integrations/google/oauth";
import { verifyWorkspaceAccess } from "@/lib/auth-workspace";

const AUTH_SECRET = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;

/** GET: Lists GA4 properties available to the connected account */
export async function GET(request: NextRequest) {
  const jwt = await getToken({ req: request, secret: AUTH_SECRET });
  if (!jwt?.sub) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const workspaceId = await getActiveWorkspaceId(jwt.sub);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });

  const accessToken = await refreshAccessToken(workspaceId);
  if (!accessToken) {
    return NextResponse.json({ error: "Google not connected or token expired" }, { status: 401 });
  }

  try {
    const res = await fetch("https://analyticsadmin.googleapis.com/v1beta/accountSummaries", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("[GA4 API] Failed to fetch properties", data);
      return NextResponse.json({ error: "Failed to fetch GA4 properties from Google" }, { status: 502 });
    }

    const properties: { id: string; name: string; displayName: string }[] = [];
    if (data.accountSummaries) {
      for (const account of data.accountSummaries) {
        if (account.propertySummaries) {
          for (const prop of account.propertySummaries) {
            properties.push({
              id: prop.property,
              name: prop.property, // "properties/123456"
              displayName: `${account.displayName} > ${prop.displayName}`,
            });
          }
        }
      }
    }

    return NextResponse.json({ properties });
  } catch (err: any) {
    console.error("[GA4 API] Exception", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** POST: Saves the selected GA4 property for the workspace */
export async function POST(request: NextRequest) {
  const jwt = await getToken({ req: request, secret: AUTH_SECRET });
  if (!jwt?.sub) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const workspaceId = await getActiveWorkspaceId(jwt.sub);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });

  const hasAccess = await verifyWorkspaceAccess(workspaceId, jwt.sub, ["OWNER", "ADMIN"]);
  if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { propertyId } = await request.json();
  if (!propertyId) return NextResponse.json({ error: "Missing propertyId" }, { status: 400 });

  const integration = await prisma.integration.findUnique({
    where: { workspaceId_provider: { workspaceId, provider: "google" } },
  });

  if (!integration) {
    return NextResponse.json({ error: "Google not connected" }, { status: 400 });
  }

  const creds = (integration.credentials as unknown) as GoogleCredentials;
  const newCreds: GoogleCredentials = {
    ...creds,
    resources: {
      ...creds.resources,
      page_analytics: {
        ...(creds.resources?.page_analytics || {}),
        ga4PropertyId: propertyId,
      },
    },
  };

  await prisma.integration.update({
    where: { id: integration.id },
    data: { credentials: newCreds as any },
  });

  return NextResponse.json({ success: true });
}
