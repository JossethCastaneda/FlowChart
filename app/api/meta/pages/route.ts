import { NextResponse } from "next/server";
import { getMetaAccessToken, metaGetAll } from "@/lib/server-auth";

export async function GET(request: Request) {
  try {
    const accessToken = await getMetaAccessToken(request);

    if (!accessToken) {
      return NextResponse.json({ data: [], source: "no_session" });
    }

    // FIX: use env var, not hardcoded version
    const version = process.env.META_API_VERSION || "v22.0";
    const url = `https://graph.facebook.com/${version}/me/accounts?fields=id,name,fan_count,picture{url},instagram_business_account{id,username,profile_picture_url,followers_count}&limit=100`;
    const { data: allData, error } = await metaGetAll(url, accessToken);

    if (error && allData.length === 0) {
      return NextResponse.json({
        data: [],
        source: "api_error",
        error,
      });
    }

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
  } catch (error: any) {
    console.error("Error in Meta pages API:", error);
    return NextResponse.json({
      data: [],
      source: "catch_error",
      error: error?.message || "Internal server error",
    });
  }
}
