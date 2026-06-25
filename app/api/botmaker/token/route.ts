import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { decryptToken } from "@/lib/encryption";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const integration = await prisma.integration.findFirst({
      where: { provider: "botmaker" },
    });
    if (!integration) return NextResponse.json({ error: "No botmaker integration" });

    const encryptedToken = (integration.credentials as any)?.accessToken;
    const token = decryptToken(encryptedToken);

    return NextResponse.json({ token: token.substring(0, 10) + "..." });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, stack: err.stack });
  }
}
