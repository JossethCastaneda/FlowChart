import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";// This endpoint is meant to be called by a Vercel Cron Job every 30-60 minutes
export async function GET(req: NextRequest) {
  try {
    // 1. Fetch all distinct adAccountIds currently in the cache
    const cachedAccounts = await prisma.metaAdsCache.findMany({
      select: { adAccountId: true },
      distinct: ['adAccountId'],
    });

    if (!cachedAccounts || cachedAccounts.length === 0) {
      return NextResponse.json({ status: "success", message: "No active accounts to sync" });
    }

    // A more robust way is to re-fetch, but since we don't have the user token in the cron context,
    // we actually can't fetch from Meta directly without an integration token!
    // We need to fetch the integrations table to get a system token.

    const integrations = await prisma.integration.findMany({
      where: { provider: "meta_ads", connected: true }
    });

    // For now, we will simply invalidate old caches so the next user visit triggers a fresh fetch.
    // Or we rely on the users visiting to keep it fresh.
    // To truly pre-warm, we need the decryptToken logic.

    return NextResponse.json({ 
      status: "success", 
      message: "Sync cron endpoint initialized. To fully sync, token decryption logic needs to be attached.",
      accounts: cachedAccounts.length 
    });
  } catch (error: any) {
    return NextResponse.json({ status: "error", error: error.message }, { status: 500 });
  }
}
