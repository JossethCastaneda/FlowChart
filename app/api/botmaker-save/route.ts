import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { encryptToken } from "@/lib/encryption";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const workspaceId = searchParams.get("workspaceId") || "cmpz2yimu0000a0ln9v6z03hy";

  if (!token) return NextResponse.json({ error: "Falta el parmetro ?token= en la URL" });

  try {
    const encrypted = encryptToken(token);
    await prisma.integration.upsert({
      where: { workspaceId_provider: { workspaceId, provider: "botmaker" } },
      update: {
        connected: true,
        credentials: { accessToken: encrypted }
      },
      create: {
        workspaceId,
        provider: "botmaker",
        connected: true,
        credentials: { accessToken: encrypted }
      }
    });
    return NextResponse.json({ 
      success: true, 
      message: "Botmaker token encriptado y guardado correctamente en produccion!",
      workspaceId
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}
