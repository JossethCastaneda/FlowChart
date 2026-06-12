import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import prisma from "@/lib/prisma";
import { getActiveWorkspaceId } from "@/lib/active-workspace";
import { refreshAccessToken, GoogleCredentials } from "@/lib/integrations/google/oauth";
import { verifyWorkspaceAccess } from "@/lib/auth-workspace";

const AUTH_SECRET = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;

/** GET: Lists accessible Google Ads Customer Accounts */
export async function GET(request: NextRequest) {
  const jwt = await getToken({ req: request, secret: AUTH_SECRET });
  if (!jwt?.sub) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const workspaceId = await getActiveWorkspaceId(jwt.sub);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });

  const accessToken = await refreshAccessToken(workspaceId);
  if (!accessToken) {
    return NextResponse.json({ error: "Google not connected or token expired" }, { status: 401 });
  }

  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  if (!developerToken) {
    return NextResponse.json({ error: "GOOGLE_ADS_DEVELOPER_TOKEN no configurado en el servidor" }, { status: 500 });
  }

  try {
    // 1. Fetch accessible customer accounts
    const res = await fetch("https://googleads.googleapis.com/v19/customers:listAccessibleCustomers", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "developer-token": developerToken,
      },
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("[Google Ads API] Failed to fetch customers", data);
      return NextResponse.json({ error: data.error?.message || "Failed to fetch accessible Ads customers" }, { status: 502 });
    }

    const resourceNames: string[] = data.resourceNames || [];
    const customers: { id: string; name: string; displayName: string }[] = [];

    // 2. Fetch descriptive names in parallel (best-effort)
    await Promise.all(
      resourceNames.map(async (resourceName) => {
        const customerId = resourceName.replace("customers/", "");
        try {
          const searchRes = await fetch(`https://googleads.googleapis.com/v19/customers/${customerId}/googleAds:searchStream`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "developer-token": developerToken,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query: "SELECT customer.id, customer.descriptive_name FROM customer LIMIT 1",
            }),
          });

          if (searchRes.ok) {
            const searchData = await searchRes.json();
            if (Array.isArray(searchData) && searchData[0]?.results?.[0]?.customer) {
              const cust = searchData[0].results[0].customer;
              customers.push({
                id: customerId,
                name: cust.descriptiveName || `Cuenta ${customerId}`,
                displayName: `${cust.descriptiveName || "Cuenta"} (${customerId})`,
              });
              return;
            }
          }
        } catch (e) {
          console.warn(`[Google Ads API] Failed to fetch name for ${customerId}`, e);
        }
        
        // Fallback if detail fetch fails
        customers.push({
          id: customerId,
          name: `Cuenta Ads ${customerId}`,
          displayName: `Cuenta Ads (${customerId})`,
        });
      })
    );

    return NextResponse.json({ customers });
  } catch (err: any) {
    console.error("[Google Ads API] Exception", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** POST: Saves the selected Google Ads Customer ID */
export async function POST(request: NextRequest) {
  const jwt = await getToken({ req: request, secret: AUTH_SECRET });
  if (!jwt?.sub) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const workspaceId = await getActiveWorkspaceId(jwt.sub);
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });

  const hasAccess = await verifyWorkspaceAccess(workspaceId, jwt.sub, ["OWNER", "ADMIN"]);
  if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { customerId } = await request.json();
  if (!customerId) return NextResponse.json({ error: "Missing customerId" }, { status: 400 });

  const integration = await prisma.integration.findUnique({
    where: { workspaceId_provider_userId: { workspaceId, provider: "google", userId: "workspace" } },
  });

  if (!integration) {
    return NextResponse.json({ error: "Google not connected" }, { status: 400 });
  }

  const creds = (integration.credentials as unknown) as GoogleCredentials;
  const newCreds: GoogleCredentials = {
    ...creds,
    resources: {
      ...creds.resources,
      google_ads: {
        ...(creds.resources?.google_ads || {}),
        customerId,
      },
    },
  };

  await prisma.integration.update({
    where: { id: integration.id },
    data: { credentials: newCreds as any },
  });

  return NextResponse.json({ success: true });
}
