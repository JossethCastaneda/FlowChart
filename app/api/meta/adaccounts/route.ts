import { NextResponse } from "next/server";
import { getMetaAccessToken, metaGetAll } from "@/lib/server-auth";

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

    const version = process.env.META_API_VERSION || "v22.0";
    const url = `https://graph.facebook.com/${version}/me/adaccounts?fields=id,name,account_id,business{id,name}&limit=100`;
    const { data: allData, error } = await metaGetAll(url, accessToken);

    if (error && allData.length === 0) {
      return NextResponse.json({
        data: [],
        source: "api_error",
        error,
      });
    }

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
