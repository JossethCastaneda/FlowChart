import { NextResponse } from "next/server";
import { getMetaAccessToken } from "@/lib/server-auth";

// No mock pages in production

export async function GET(request: Request) {
  try {
    const accessToken = await getMetaAccessToken(request);

    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const version = process.env.META_API_VERSION || "v22.0";

    let allData: any[] = [];
    let nextUrl: string | null = `https://graph.facebook.com/${version}/me/accounts?fields=id,name,fan_count,picture{url},instagram_business_account{id,username,profile_picture_url,followers_count}&limit=100`;

    while (nextUrl) {
      const res: Response = await fetch(nextUrl, { headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` } });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.warn("Meta API pages request failed:", errData);
        if (allData.length === 0) {
          return NextResponse.json({ 
            data: [{ 
              id: "error", 
              name: `ERROR: ${errData?.error?.message || JSON.stringify(errData)}`, 
              picture: "", 
              portfolio: "Error API", 
              instagram: null 
            }], 
            source: "fallback_api_error", 
            error: errData 
          });
        }
        break; // Return what we have so far
      }
      const json = await res.json();
      if (json.data) allData = allData.concat(json.data);
      nextUrl = json.paging?.next || null;
    }
    
    const pages = allData.map((page: any) => ({
      id: page.id,
      name: page.name,
      portfolio: "Páginas y Perfiles",
      picture: page.picture?.data?.url || `https://ui-avatars.com/api/?name=${encodeURIComponent(page.name)}&background=random`,
      followers: page.fan_count || 0,
      instagram: page.instagram_business_account ? {
        id: page.instagram_business_account.id,
        username: page.instagram_business_account.username,
        picture: page.instagram_business_account.profile_picture_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(page.instagram_business_account.username)}&background=random`,
        followers: page.instagram_business_account.followers_count || 0,
      } : null
    }));

    return NextResponse.json({
      data: pages,
      source: "meta_api",
    });
  } catch (error: any) {
    console.error("Error in Meta pages API:", error);
    return NextResponse.json({
      data: [],
      source: "catch_error",
      error: "Error fetching pages",
    });
  }
}
