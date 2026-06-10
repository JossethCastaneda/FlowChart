import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const users = await prisma.user.findMany({
    include: {
      accounts: true,
      workspaces: { include: { workspace: true } }
    }
  });
  return NextResponse.json(users);
}
