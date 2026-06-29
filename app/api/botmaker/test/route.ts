import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createConnection, listSessions } from "@/lib/botmaker-api";
import { decryptToken } from "@/lib/encryption";
import { BmConnection } from "@/lib/botmaker-api";
import { normalizeBotmakerBase } from "@/lib/botmaker";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const integration = await prisma.integration.findFirst({
      where: { provider: "botmaker" },
    });
    if (!integration) return NextResponse.json({ error: "No botmaker integration" });

    const encryptedToken = (integration.credentials as any)?.accessToken;
    const token = decryptToken(encryptedToken);
    const baseUrl = normalizeBotmakerBase((integration.credentials as any)?.baseUrl);

    const conn: BmConnection = createConnection(token, baseUrl);

    // Let's test a simple 24-hour chunk from 3 days ago
    const from = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const to = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

    const result = await listSessions(conn, {
      from,
      to,
      includeMessages: false,
      includeEvents: false,
      maxPages: 3,
    });

    return NextResponse.json({ from, to, count: result.length, sample: result.slice(0, 2) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, stack: err.stack });
  }
}
