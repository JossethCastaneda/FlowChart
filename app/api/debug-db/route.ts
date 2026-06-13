import { NextResponse } from "next/server";

// This endpoint has been disabled for security reasons.
// It previously exposed all user data without authentication.
export async function GET() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
