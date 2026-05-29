import { NextResponse } from "next/server";
import { getMetaAccessToken } from "@/lib/server-auth";

// No mock accounts in production

export async function GET(request: Request) {
  try {
    const accessToken = await getMetaAccessToken(request);

    if (!accessToken) {
      return NextResponse.json({
        data: [],
        source: "no_session",
        message: "No active Meta session token found."
      });
    }

    let allData: any[] = [];
    let nextUrl: string | null = `https://graph.facebook.com/v20.0/me/adaccounts?fields=id,name,account_id,business{id,name}&limit=100&access_token=${accessToken}`;

    while (nextUrl) {
      const res: Response = await fetch(nextUrl, { headers: { "Content-Type": "application/json" } });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.warn("Meta API request failed:", errData);
        if (allData.length === 0) {
          return NextResponse.json({ 
            data: [{ id: "error", name: `API Error: ${errData?.error?.message || "Unknown error"}` }], 
            source: "api_error" 
          });
        }
        break; // Return what we have so far
      }
      const json = await res.json();
      if (json.data) allData = allData.concat(json.data);
      nextUrl = json.paging?.next || null;
    }
    
    // Map Meta API fields to the format expected by the app
    const accounts = allData.map((acc: any) => {
      const portfolioName = acc.business?.name || "Sin Portafolio Comercial";

      return {
        id: acc.id,
        name: acc.name ? `${acc.name} — ${acc.id}` : `Ad Account ${acc.account_id} — ${acc.id}`,
        portfolio: portfolioName,
      };
    });

    return NextResponse.json({
      data: accounts,
      source: "meta_api",
    });
  } catch (error: any) {
    console.error("Error in Meta adaccounts API:", error);
    return NextResponse.json({
      data: [],
      source: "catch_error",
      error: error.message || "Internal server error"
    });
  }
}
